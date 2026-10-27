import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { toast } from 'sonner';
import { Artwork, MuseumLabel } from '@/components/artwork';
import { ErrorAlert } from '@/components/form';
import { LotStatusLabel } from '@/components/lot-status';
import { BigPaddle, Paddle, PaddleNumber } from '@/components/paddle';
import { ErrorWall } from '@/components/empty-wall';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ANTI_SNIPING_EXTENSION_MS,
  ANTI_SNIPING_WINDOW_MS,
  ErrorCode,
  LOT_DETAIL_BIDS_LIMIT,
  LotStatus,
  ROUTES,
  Role,
  SocketEvent,
  auditPath,
  receiptPath,
} from '@/constants';
import { ApiError, api, assetUrl, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatMoney, formatMoneyInput, parseMoney } from '@/lib/money';
import { socket } from '@/lib/socket';
import { clockOffset, formatCountdown, formatRelative, formatShortDate, formatTime, MINUTE_MS, SECOND_MS, useServerNow } from '@/lib/time';
import { useWallet } from '@/lib/wallet';
import type {
  BidNewEvent,
  BidResponse,
  LotCancelledEvent,
  LotDetail,
  LotEndedEvent,
  LotExtendedEvent,
} from '@/types';

const ANTI_SNIPING_TEXT = `Um lance nos últimos ${ANTI_SNIPING_WINDOW_MS / MINUTE_MS} minutos estende o fim para ${
  ANTI_SNIPING_EXTENSION_MS / MINUTE_MS
} minutos depois dele.`;
/** Folga para a API já ter o novo status quando a sala relê no início/fim. */
const BOUNDARY_RELOAD_DELAY_MS = SECOND_MS;

const eyebrow = 'text-[11.5px] font-semibold tracking-[0.14em] text-muted-foreground uppercase';

const QUICK_BID_STEPS = [1, 3] as const;

/** Uma resposta atrasada não apaga lance mais novo: `bidCount` só cresce. */
function newerOf(current: LotDetail | null, next: LotDetail): LotDetail {
  return current && current.id === next.id && next.bidCount < current.bidCount ? current : next;
}

type BidUpdate = Omit<BidNewEvent, 'lotId' | 'serverTime'> & { serverTime?: string };

/** Chega pelo `bid:new` e pela resposta do POST: `seq` repetido ou mais antigo é ignorado. */
function withBid(lot: LotDetail, update: BidUpdate): LotDetail {
  if (update.bid.seq <= (lot.bids[0]?.seq ?? 0)) return lot;
  return {
    ...lot,
    bids: [update.bid, ...lot.bids].slice(0, LOT_DETAIL_BIDS_LIMIT),
    currentBid: update.currentBid,
    minimumNextBid: update.minimumNextBid,
    endsAt: update.endsAt,
    bidCount: Math.max(lot.bidCount, update.bidCount),
    serverTime: update.serverTime ?? lot.serverTime,
    me: lot.me && { ...lot.me, isLeader: update.bid.pseudonym === lot.me.pseudonym },
  };
}

const extendedToast = (lotId: string, endsAt: string) =>
  toast.info(`Prorrogado: novo fim às ${formatTime(endsAt)}`, {
    id: `${SocketEvent.LOT_EXTENDED}:${lotId}:${endsAt}`, // o mesmo aviso não aparece duas vezes (POST e socket)
    description: ANTI_SNIPING_TEXT,
  });

function useLotRoom(id: string) {
  const { user } = useAuth();
  const isBidder = user?.role === Role.BIDDER;
  const [reload, setReload] = useState(0);
  const [lot, setLot] = useState<LotDetail | null>(null);
  const [error, setError] = useState<{ key: string; message: string; notFound: boolean } | null>(null);
  const requestKey = `${id}:${reload}`;
  const refresh = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    api<LotDetail>(`/api/lots/${encodeURIComponent(id)}`, { signal: controller.signal }).then(
      (data) => setLot((current) => newerOf(current, data)),
      (err: unknown) => {
        if (controller.signal.aborted) return;
        const notFound = err instanceof ApiError && err.code === ErrorCode.NOT_FOUND;
        setError({ key: requestKey, message: errorMessage(err), notFound });
      },
    );
    return () => controller.abort();
  }, [id, requestKey]);

  useEffect(() => {
    const join = () => socket.emit(SocketEvent.LOT_JOIN, { lotId: id });
    const onState = (data: LotDetail) => {
      if (data.id === id) setLot((current) => newerOf(current, data));
    };
    const onBid = (event: BidNewEvent) => {
      if (event.lotId !== id) return;
      setLot((current) => current && withBid(current, event));
      if (isBidder) refresh(); // posição e total de licitantes vêm do servidor
    };
    const onExtended = (event: LotExtendedEvent) => {
      if (event.lotId !== id) return;
      setLot((current) => current && { ...current, endsAt: event.endsAt, serverTime: event.serverTime });
      extendedToast(id, event.endsAt);
    };
    const onEnded = (event: LotEndedEvent) => {
      if (event.lotId !== id) return;
      setLot(
        (current) =>
          current && {
            ...current,
            status: LotStatus.ENDED,
            result: current.result ?? {
              sold: event.winnerPseudonym !== null,
              winnerPseudonym: event.winnerPseudonym,
              amount: event.amount,
              settledAt: new Date().toISOString(),
            },
          },
      );
      refresh(); // traz o código do comprovante para o vencedor
    };
    const onCancelled = (event: LotCancelledEvent) => {
      if (event.lotId !== id) return;
      setLot((current) => current && { ...current, status: LotStatus.CANCELLED });
      toast.info('Este lote foi cancelado pelo leiloeiro.');
    };

    socket.on(SocketEvent.CONNECT, join);
    socket.on(SocketEvent.LOT_STATE, onState);
    socket.on(SocketEvent.BID_NEW, onBid);
    socket.on(SocketEvent.LOT_EXTENDED, onExtended);
    socket.on(SocketEvent.LOT_ENDED, onEnded);
    socket.on(SocketEvent.LOT_CANCELLED, onCancelled);
    if (socket.connected) join();
    return () => {
      socket.emit(SocketEvent.LOT_LEAVE, { lotId: id });
      socket.off(SocketEvent.CONNECT, join);
      socket.off(SocketEvent.LOT_STATE, onState);
      socket.off(SocketEvent.BID_NEW, onBid);
      socket.off(SocketEvent.LOT_EXTENDED, onExtended);
      socket.off(SocketEvent.LOT_ENDED, onEnded);
      socket.off(SocketEvent.LOT_CANCELLED, onCancelled);
    };
  }, [id, isBidder, refresh]);

  const applyOwnBid = useCallback((response: BidResponse) => {
    setLot((current) => current && withBid(current, { ...response, bidCount: response.bid.seq }));
  }, []);

  return {
    lot: lot?.id === id ? lot : null,
    error: error?.key === requestKey ? error : null,
    refresh,
    applyOwnBid,
  };
}

export function LotRoomPage() {
  const { id = '' } = useParams();
  const { lot, error, refresh, applyOwnBid } = useLotRoom(id);

  if (error && !error.notFound) {
    return (
      <div className="pt-7">
        <ErrorWall title="A sala não carregou" message={error.message} onRetry={refresh} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="grid justify-items-start gap-3 pt-7">
        <h1 className="text-3xl font-bold tracking-tight">Lote não encontrado</h1>
        <Link to={ROUTES.SHOWCASE} className="text-primary underline-offset-4 hover:underline">
          Voltar para a vitrine
        </Link>
      </div>
    );
  }
  if (!lot) {
    return (
      <p role="status" className="pt-7 text-muted-foreground">
        Carregando o lote…
      </p>
    );
  }
  return <Room lot={lot} onChanged={refresh} onOwnBid={applyOwnBid} />;
}

function Room({ lot, onChanged, onOwnBid }: { lot: LotDetail; onChanged: () => void; onOwnBid: (response: BidResponse) => void }) {
  const offset = useMemo(() => clockOffset(lot.serverTime), [lot.serverTime]);
  const now = useServerNow(offset);
  const me = lot.me;
  const leader = lot.bids[0] ?? null;
  const isMine = (pseudonym: string) => me?.pseudonym === pseudonym;

  // O socket não avisa a abertura e o `lot:ended` só sai após a liquidação: relê no início e no fim.
  const boundary = lot.status === LotStatus.SCHEDULED ? lot.startsAt : lot.status === LotStatus.LIVE ? lot.endsAt : null;
  useEffect(() => {
    if (!boundary) return;
    const timer = setTimeout(onChanged, Math.max(0, new Date(boundary).getTime() - (Date.now() + offset)) + BOUNDARY_RELOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [boundary, offset, onChanged]);

  const meta = [lot.item.date, lot.item.medium, lot.item.department].filter(Boolean).join(' · ');
  const facts = [
    { label: 'Lance inicial', value: formatMoney(lot.startingBid) },
    { label: 'Incremento mínimo', value: formatMoney(lot.minIncrement) },
    { label: 'Lances', value: String(lot.bidCount) },
    { label: 'Início', value: formatShortDate(lot.startsAt) },
    { label: 'Fim', value: formatShortDate(lot.endsAt) },
  ];

  return (
    <div className="grid items-start gap-10 pt-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div className="grid gap-5">
        <Artwork src={assetUrl(lot.item.imageUrl)} alt={lot.title} className="max-w-130" />
        <div className="grid gap-px">
          <h1 className="sr-only">{lot.title}</h1>
          <MuseumLabel artist={lot.artist} title={lot.title} meta={meta} titleClassName="text-[28px]" />
        </div>
        <dl className="grid max-w-130 grid-cols-2 gap-x-5 gap-y-2.5 border-t pt-4 text-[13.5px] sm:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-xs text-muted-foreground">{fact.label}</dt>
              <dd className="font-medium tabular-nums">{fact.value}</dd>
            </div>
          ))}
          <div>
            <dt className="text-xs text-muted-foreground">Auditoria</dt>
            <dd>
              <Link to={auditPath(lot.id)} className="font-medium text-primary underline-offset-4 hover:underline">
                Ver histórico
              </Link>
            </dd>
          </div>
        </dl>
      </div>

      <aside aria-label="Painel de lances" className="grid gap-4.5 rounded-[10px] border bg-card p-5.5 lg:sticky lg:top-24">
        <PositionBanner lot={lot} />

        <div className="grid gap-0.5">
          <span className="inline-flex items-center gap-1.5">
            <LotStatusLabel status={lot.status} />
            <span className="text-[11.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              · {!leader ? 'lance inicial' : lot.status === LotStatus.ENDED ? 'lance vencedor' : lot.status === LotStatus.CANCELLED ? 'último lance' : 'lance atual'}
            </span>
          </span>
          <span className="text-[clamp(44px,6vw,60px)] leading-none font-bold tracking-tight tabular-nums">
            {formatMoney(lot.currentBid ?? lot.startingBid, { short: true })}
          </span>
          <span className="text-[13px] text-muted-foreground">
            {leader ? (
              <>
                por <Paddle pseudonym={leader.pseudonym} mine={isMine(leader.pseudonym)} />
              </>
            ) : lot.status === LotStatus.ENDED ? (
              'Encerrado sem lances.'
            ) : (
              'Ninguém deu lance ainda.'
            )}
          </span>
        </div>

        {lot.status !== LotStatus.CANCELLED && <Clock lot={lot} now={now} />}

        {me && me.position !== null && lot.status !== LotStatus.CANCELLED && (
          <div className="flex items-center gap-3.5">
            <BigPaddle pseudonym={me.pseudonym} />
            <p className="text-sm">
              Você participa como <PaddleNumber pseudonym={me.pseudonym} />.
              <br />
              Você é o <b className="font-semibold">{me.position}º de {me.totalBidders}</b> {me.totalBidders === 1 ? 'licitante' : 'licitantes'}.
            </p>
          </div>
        )}

        <BidArea lot={lot} onChanged={onChanged} onOwnBid={onOwnBid} />

        <section aria-labelledby="history-heading" className="grid">
          <h2 id="history-heading" className="pb-2 text-[13px] font-semibold tracking-widest text-muted-foreground uppercase">
            Histórico de lances
          </h2>
          <ol aria-live="polite" className="grid">
            {lot.bids.map((bid, index) => (
              <li
                key={bid.seq}
                className="grid grid-cols-[36px_minmax(0,1fr)_auto_auto] items-center gap-3 border-t py-2.25 text-sm"
              >
                <span className="font-mono text-xs text-muted-foreground">#{bid.seq}</span>
                <Paddle pseudonym={bid.pseudonym} mine={isMine(bid.pseudonym)} />
                <span className={index === 0 ? 'font-mono font-medium text-primary tabular-nums' : 'font-mono font-medium tabular-nums'}>
                  {formatMoney(bid.amount, { short: true })}
                </span>
                <time dateTime={bid.createdAt} className="min-w-16 text-right text-[12.5px] text-muted-foreground">
                  {formatRelative(bid.createdAt, now)}
                </time>
              </li>
            ))}
          </ol>
          {lot.bids.length === 0 && <p className="border-t py-3 text-sm text-muted-foreground">Nenhum lance ainda.</p>}
          {lot.bidCount > lot.bids.length && (
            <p className="border-t pt-3 text-[12.5px] text-muted-foreground">
              Mostrando os {lot.bids.length} lances mais recentes de {lot.bidCount}. A auditoria mostra todos.
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}

function PositionBanner({ lot }: { lot: LotDetail }) {
  const me = lot.me;
  if (!me || me.position === null || lot.status !== LotStatus.LIVE) return null;
  const amount = formatMoney(lot.currentBid ?? 0);
  const [title, text] = me.isLeader
    ? ['Você está ganhando', `Seu lance de ${amount} está comprometido na carteira.`]
    : ['Você foi superado', 'O valor do seu lance já voltou para o saldo disponível.'];
  return (
    <div role="status" className={me.isLeader ? 'grid gap-0.5 rounded-lg bg-win-soft px-3.5 py-3 text-sm text-win' : 'grid gap-0.5 rounded-lg bg-warn-soft px-3.5 py-3 text-sm text-warn'}>
      <b className="text-[15px] font-semibold">{title}</b>
      <span>{text}</span>
    </div>
  );
}

function Clock({ lot, now }: { lot: LotDetail; now: number }) {
  let label: string;
  let value: string;
  if (lot.status === LotStatus.LIVE) {
    label = 'Termina em';
    value = formatCountdown(new Date(lot.endsAt).getTime() - now);
  } else if (lot.status === LotStatus.SCHEDULED) {
    label = 'Começa em';
    value = formatCountdown(new Date(lot.startsAt).getTime() - now);
  } else {
    label = 'Encerrado em';
    value = formatShortDate(lot.endsAt);
  }
  return (
    <div className="border-y py-3">
      <div className={eyebrow}>{label}</div>
      <div className="font-mono text-[26px] font-medium tabular-nums">{value}</div>
      {lot.status !== LotStatus.ENDED && (
        <p className="mt-1.5 text-[12.5px] text-muted-foreground">{ANTI_SNIPING_TEXT}</p>
      )}
    </div>
  );
}

function BidArea({ lot, onChanged, onOwnBid }: { lot: LotDetail; onChanged: () => void; onOwnBid: (response: BidResponse) => void }) {
  const { user } = useAuth();
  const location = useLocation();
  const notice = 'rounded-lg bg-muted px-3.5 py-3 text-sm text-muted-foreground';

  if (lot.status === LotStatus.CANCELLED) return <p className={notice}>Este lote foi cancelado. Os lances não valem mais.</p>;
  if (lot.status === LotStatus.ENDED) return <LotResult lot={lot} />;
  if (!user) {
    return (
      <p className={notice}>
        <Link to={ROUTES.LOGIN} state={{ from: location.pathname }} className="font-semibold text-primary underline-offset-4 hover:underline">
          Entre para dar lances
        </Link>
        . Ainda não tem conta?{' '}
        <Link to={ROUTES.REGISTER} state={{ from: location.pathname }} className="text-primary underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
    );
  }
  if (user.role === Role.AUCTIONEER) return <p className={notice}>Leiloeiros não dão lances. Você pode acompanhar a sala.</p>;
  if (lot.status === LotStatus.SCHEDULED) {
    return <p className={notice}>Os lances abrem em {formatShortDate(lot.startsAt)}.</p>;
  }
  return <BidForm lot={lot} onChanged={onChanged} onOwnBid={onOwnBid} />;
}

function LotResult({ lot }: { lot: LotDetail }) {
  const notice = 'rounded-lg bg-muted px-3.5 py-3 text-sm text-muted-foreground';
  const result = lot.result;
  if (!result) {
    return (
      <p role="status" className={notice}>
        Lote encerrado. Apurando resultado…
      </p>
    );
  }
  if (!result.sold || !result.winnerPseudonym || result.amount === null) {
    return (
      <p role="status" className={notice}>
        Encerrado sem lances.
      </p>
    );
  }
  const amount = formatMoney(result.amount);
  if (lot.me?.pseudonym === result.winnerPseudonym) {
    return (
      <div role="status" className="grid gap-2.5 rounded-lg bg-win-soft px-3.5 py-3 text-sm text-win">
        <div className="grid gap-0.5">
          <b className="text-[15px] font-semibold">Você arrematou este lote</b>
          <span>Seu lance de {amount} venceu.</span>
        </div>
        {lot.me.receiptCode ? (
          <Button asChild className="justify-self-start">
            <Link to={receiptPath(lot.me.receiptCode)}>Ver comprovante</Link>
          </Button>
        ) : (
          <span>Gerando o comprovante…</span>
        )}
      </div>
    );
  }
  return (
    <p role="status" className={notice}>
      Arrematado por <Paddle pseudonym={result.winnerPseudonym} /> por <b className="font-semibold text-foreground">{amount}</b>.
    </p>
  );
}

function BidForm({ lot, onChanged, onOwnBid }: { lot: LotDetail; onChanged: () => void; onOwnBid: (response: BidResponse) => void }) {
  const { wallet } = useWallet();
  const [amount, setAmount] = useState('');
  const [refusal, setRefusal] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const quick = [
    { label: 'mínimo', value: lot.minimumNextBid },
    ...QUICK_BID_STEPS.map((steps) => ({
      label: `+ ${formatMoney(lot.minIncrement * steps, { short: true })}`,
      value: lot.minimumNextBid + lot.minIncrement * steps,
    })),
  ];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cents = parseMoney(amount);
    if (!cents) {
      setRefusal(`Digite o valor do lance, ex.: ${formatMoneyInput(lot.minimumNextBid)}.`);
      return;
    }
    setSubmitting(true);
    setRefusal(null);
    try {
      const result = await api<BidResponse>(`/api/lots/${lot.id}/bids`, { method: 'POST', body: { amount: cents } });
      onOwnBid(result);
      toast.success(`Lance de ${formatMoney(result.bid.amount)} aceito`);
      if (result.extended) extendedToast(lot.id, result.endsAt);
      setAmount('');
    } catch (err) {
      setRefusal(errorMessage(err));
    } finally {
      setSubmitting(false);
      // Relê a posição (e o lote, se recusado); a carteira chega pelo `wallet:update`.
      onChanged();
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-2.5">
      <div className="grid gap-1">
        <Label htmlFor="bid-amount" className="text-[13px] font-semibold">
          Seu lance
        </Label>
        <Input
          id="bid-amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder={formatMoneyInput(lot.minimumNextBid)}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-describedby="bid-hint"
          aria-invalid={refusal ? true : undefined}
          className="font-mono text-base"
        />
        <span id="bid-hint" className="text-[12.5px] text-muted-foreground">
          Lance mínimo aceito: {formatMoney(lot.minimumNextBid)} · disponível: {wallet ? formatMoney(wallet.available) : '—'}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Valores rápidos">
        {quick.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => setAmount(formatMoneyInput(option.value))}
            className="rounded-full border bg-card px-2.5 py-1 font-mono text-[12.5px] hover:bg-muted"
          >
            {option.label}
          </button>
        ))}
      </div>
      {refusal && <ErrorAlert>{refusal}</ErrorAlert>}
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Enviando lance…' : 'Dar lance'}
      </Button>
    </form>
  );
}

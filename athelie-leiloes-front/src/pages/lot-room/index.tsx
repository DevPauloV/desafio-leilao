import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { Artwork, MuseumLabel } from '@/components/artwork';
import { LotStatusLabel } from '@/components/lot-status';
import { BigPaddle, Paddle, PaddleNumber } from '@/components/paddle';
import { ErrorWall } from '@/components/empty-wall';
import { LotStatus, ROUTES, auditPath } from '@/constants';
import { useLotRoom } from '@/hooks/use-lot-room';
import { useServerNow } from '@/hooks/use-server-now';
import { assetUrl } from '@/lib/api';
import { ANTI_SNIPING_TEXT } from '@/lib/lot-room';
import { formatMoney } from '@/lib/money';
import { clockOffset, formatCountdown, formatRelative, formatShortDate, SECOND_MS } from '@/lib/time';
import type { BidResponse, LotDetail } from '@/types';
import { BidArea, PositionBanner } from './bid-area';
import { RoomSkeleton } from './room-skeleton';

/** Folga para a API já ter o novo status quando a sala relê no início/fim. */
const BOUNDARY_RELOAD_DELAY_MS = SECOND_MS;

const eyebrow = 'text-[11.5px] font-semibold tracking-[0.14em] text-muted-foreground uppercase';

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
  if (!lot) return <RoomSkeleton />;
  return <Room lot={lot} onChanged={refresh} onOwnBid={applyOwnBid} />;
}

export function Room({ lot, onChanged, onOwnBid }: { lot: LotDetail; onChanged: () => void; onOwnBid: (response: BidResponse) => void }) {
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

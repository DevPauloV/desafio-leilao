import { useEffect, useMemo } from 'react';
import { CheckIcon } from 'lucide-react';
import { cn } from 'cn';
import { Link, useParams } from 'react-router';
import { Artwork, MuseumLabel } from '@/components/artwork';
import { LotStatusLabel } from '@/components/lot-status';
import { Paddle } from '@/components/paddle';
import { ErrorWall } from '@/components/empty-wall';
import { ANTI_SNIPING_WINDOW_MS, LotStatus, ROUTES, auditPath } from '@/constants';
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

const priceLabel = 'text-[12.5px] font-semibold text-muted-foreground';

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
  const participant = me && me.position !== null ? me : null;

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
          {participant && (
            <div>
              <dt className="text-xs text-muted-foreground">Você participa como</dt>
              <dd className="flex h-5 items-center">
                <Paddle pseudonym={participant.pseudonym} accent />
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-muted-foreground">Auditoria</dt>
            <dd>
              <Link to={auditPath(lot.id)} className="font-medium text-primary underline-offset-4 hover:underline">
                Ver histórico público
              </Link>
            </dd>
          </div>
        </dl>
      </div>

      <aside aria-label="Painel de lances" className="grid gap-4.5 rounded-[10px] border bg-card p-5.5 lg:sticky lg:top-24">
        <div className="flex items-center justify-between gap-3">
          <LotStatusLabel status={lot.status} />
          <span className="text-[13px] text-muted-foreground tabular-nums">
            {lot.bidCount} {lot.bidCount === 1 ? 'lance' : 'lances'}
          </span>
        </div>

        <PositionBanner lot={lot} />

        <div className="grid gap-2">
          <div className="grid gap-1">
            <span className={priceLabel}>
              {!leader
                ? 'Lance inicial'
                : lot.status === LotStatus.ENDED
                  ? 'Lance vencedor'
                  : lot.status === LotStatus.CANCELLED
                    ? 'Último lance'
                    : 'Lance atual'}
            </span>
            <span
              key={lot.currentBid}
              className="justify-self-start text-[clamp(34px,3.8vw,44px)] leading-none font-extrabold tracking-tight tabular-nums motion-safe:animate-bump"
            >
              {formatMoney(lot.currentBid ?? lot.startingBid)}
            </span>
          </div>
          {lot.status !== LotStatus.CANCELLED && (
            <div className="mt-2 grid gap-1.5">
              <Clock lot={lot} now={now} />
              {lot.status === LotStatus.LIVE && <TimeBar lot={lot} now={now} />}
            </div>
          )}
          {!participant && (
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
          )}
          {(lot.status === LotStatus.LIVE || lot.status === LotStatus.SCHEDULED) && (
            <p className="text-[12.5px] text-muted-foreground">{ANTI_SNIPING_TEXT}</p>
          )}
        </div>

        <BidArea lot={lot} onChanged={onChanged} onOwnBid={onOwnBid} />

        <section aria-labelledby="history-heading" className="-mx-5.5 -mb-5.5 grid border-t pb-2.5">
          <div className="flex items-center justify-between gap-3 px-5.5 pt-3.5 pb-1.5">
            <h2 id="history-heading" className="inline-flex items-center gap-2 text-sm font-bold">
              {lot.status === LotStatus.LIVE && <span aria-hidden="true" className="size-[7px] rounded-full bg-primary motion-safe:animate-live" />}
              Lances
            </h2>
            <Link to={auditPath(lot.id)} className="text-[13px] font-semibold text-primary underline-offset-4 hover:underline">
              Auditar histórico
            </Link>
          </div>
          <ol aria-live="polite" className="grid">
            {lot.bids.map((bid, index) => (
              <li
                key={bid.seq}
                className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5.5 py-1.5', index === 0 && 'bg-primary/7')}
              >
                <div className="grid min-w-0">
                  <Paddle pseudonym={bid.pseudonym} mine={isMine(bid.pseudonym)} />
                  <time dateTime={bid.createdAt} className="pl-4.5 text-[11.5px] leading-4 text-muted-foreground">
                    {formatRelative(bid.createdAt, now)}
                  </time>
                </div>
                <div className="grid justify-items-end">
                  <span className="text-sm font-bold tabular-nums">{formatMoney(bid.amount)}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] leading-4 font-semibold text-win">
                    <CheckIcon aria-hidden="true" className="size-3" />
                    registrado
                  </span>
                </div>
              </li>
            ))}
          </ol>
          {lot.bids.length === 0 && <p className="px-5.5 py-3 text-sm text-muted-foreground">Nenhum lance ainda.</p>}
          {lot.bidCount > lot.bids.length && (
            <p className="mx-5.5 border-t pt-3 text-[12.5px] text-muted-foreground">
              Mostrando os {lot.bids.length} lances mais recentes de {lot.bidCount}. A auditoria mostra todos.
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}

const isClosing = (lot: LotDetail, now: number) => new Date(lot.endsAt).getTime() - now <= ANTI_SNIPING_WINDOW_MS;

function Clock({ lot, now }: { lot: LotDetail; now: number }) {
  let label: string;
  let value: string;
  if (lot.status === LotStatus.LIVE) {
    label = 'Encerra em';
    value = formatCountdown(new Date(lot.endsAt).getTime() - now);
  } else if (lot.status === LotStatus.SCHEDULED) {
    label = 'Começa em';
    value = formatCountdown(new Date(lot.startsAt).getTime() - now);
  } else {
    label = 'Encerrado em';
    value = formatShortDate(lot.endsAt);
  }
  const hot = lot.status === LotStatus.LIVE && isClosing(lot, now);
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={priceLabel}>{label}</span>
      <span className={cn('text-[15px] font-bold tabular-nums transition-colors', hot && 'text-primary')}>{value}</span>
    </div>
  );
}

/** Quanto do pregão já passou; fica bordô na janela do anti-sniping. */
function TimeBar({ lot, now }: { lot: LotDetail; now: number }) {
  const start = new Date(lot.startsAt).getTime();
  const total = new Date(lot.endsAt).getTime() - start;
  const elapsed = total > 0 ? Math.min(1, Math.max(0, (now - start) / total)) : 1;
  return (
    <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          'h-full rounded-full transition-[width,background-color] duration-1000 ease-linear',
          isClosing(lot, now) ? 'bg-primary' : 'bg-foreground',
        )}
        style={{ width: `${elapsed * 100}%` }}
      />
    </div>
  );
}

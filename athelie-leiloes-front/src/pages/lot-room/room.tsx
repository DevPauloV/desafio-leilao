import { useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { Artwork } from '@/components/artwork';
import { LotStatusLabel } from '@/components/lot-status';
import { MuseumLabel } from '@/components/museum-label';
import { Paddle } from '@/components/paddle';
import { LotStatus, auditPath } from '@/constants';
import { useServerNow } from '@/hooks/use-server-now';
import { assetUrl } from '@/lib/api';
import { ANTI_SNIPING_TEXT } from '@/lib/lot-room';
import { formatMoney } from '@/lib/money';
import { clockOffset, formatShortDate, SECOND_MS } from '@/lib/time';
import type { BidResponse, LotDetail } from '@/types';
import { BidArea } from './bid-area';
import { BidHistory } from './bid-history';
import { Clock } from './clock';
import { PositionBanner } from './position-banner';
import { priceLabel } from './price-label';
import { TimeBar } from './time-bar';

/** Folga para a API já ter o novo status quando a sala relê no início/fim. */
const BOUNDARY_RELOAD_DELAY_MS = SECOND_MS;

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

        <BidHistory lot={lot} now={now} isMine={isMine} />
      </aside>
    </div>
  );
}

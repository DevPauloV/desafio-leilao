import { Link } from 'react-router';
import { cn } from 'cn';
import { Artwork, MuseumLabel } from '@/components/artwork';
import { LotStatusLabel } from '@/components/lot-status';
import { Bone } from '@/components/skeleton';
import { LotStatus, lotPath } from '@/constants';
import { assetUrl } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { formatCountdown, formatShortDate } from '@/lib/time';
import type { LotSummary } from '@/types';

/** O Met costuma pôr nome original e série entre parênteses depois do título. */
const shortTitle = (title: string) => title.split(' (')[0];

const pill = 'inline-flex items-center rounded-full border border-border/70 bg-card/85 px-2.5 py-1 backdrop-blur-sm';

export function LotCard({ lot, now }: { lot: LotSummary; now: number }) {
  const hasBids = lot.bidCount > 0;
  const unsold = lot.status === LotStatus.ENDED && !hasBids;
  let value: string;
  let valueCaption: string | null;
  let timeCaption: string;
  let when: string;
  if (lot.status === LotStatus.LIVE) {
    value = formatMoney(lot.currentBid ?? lot.startingBid, { short: true });
    valueCaption = hasBids ? 'lance atual' : 'lance inicial';
    timeCaption = 'Termina em';
    when = formatCountdown(new Date(lot.endsAt).getTime() - now);
  } else if (lot.status === LotStatus.SCHEDULED) {
    value = formatMoney(lot.startingBid, { short: true });
    valueCaption = 'lance inicial';
    timeCaption = 'Começa em';
    when = formatShortDate(lot.startsAt);
  } else {
    value = hasBids && lot.currentBid !== null ? formatMoney(lot.currentBid, { short: true }) : 'Sem lances';
    valueCaption = hasBids ? 'arrematado' : null;
    timeCaption = 'Encerrado em';
    when = formatShortDate(lot.endsAt);
  }

  return (
    <Link to={lotPath(lot.id)} title={lot.title} className="group grid grid-rows-[auto_1fr_auto] gap-4 text-inherit no-underline">
      <Artwork src={assetUrl(lot.imageUrl)} alt={lot.title}>
        <div className="absolute inset-x-3 top-3 flex flex-wrap justify-between gap-2">
          <span className={pill}>
            <LotStatusLabel status={lot.status} />
          </span>
          <span className={cn(pill, 'font-mono text-[12.5px] tabular-nums')}>
            <span className="sr-only">{timeCaption} </span>
            {when}
          </span>
        </div>
      </Artwork>
      <MuseumLabel
        compact
        artist={lot.artist}
        title={shortTitle(lot.title)}
        meta={[lot.date, lot.medium].filter(Boolean).join(' · ') || lot.department}
      />
      <div className="flex items-end justify-between gap-3 border-t pt-3">
        <div>
          <div className={unsold ? 'text-lg leading-[1.1] font-bold' : 'text-2xl leading-[1.1] font-bold tracking-tight tabular-nums'}>
            {value}
          </div>
          {valueCaption && <div className="text-xs text-muted-foreground">{valueCaption}</div>}
        </div>
        {hasBids && (
          <div className="text-sm text-muted-foreground tabular-nums">
            {lot.bidCount} {lot.bidCount === 1 ? 'lance' : 'lances'}
          </div>
        )}
      </div>
    </Link>
  );
}

const SKELETON_CARDS = 3;

/** Mesmas alturas do LotCard (obra, etiqueta e preço): quando os lotes chegam, nada muda de lugar. */
export function LotGridSkeleton() {
  return (
    <div role="status" aria-label="Carregando lotes" className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: SKELETON_CARDS }, (_, row) => (
        <div key={row} className="grid gap-4">
          <Bone row={row} className="aspect-4/5 rounded-[10px] bg-wall" />
          <div className="grid gap-px">
            <div className="flex h-5 items-center">
              <Bone row={row} className="h-3.5 w-2/5" />
            </div>
            <div className="flex h-5.75 items-center">
              <Bone row={row} className="h-4.5 w-3/4" />
            </div>
            <div className="flex h-5 items-center">
              <Bone row={row} className="h-3 w-1/2" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-3 border-t pt-3">
            <div className="grid">
              <div className="flex h-6.5 items-center">
                <Bone row={row} className="h-6 w-28 rounded-md" />
              </div>
              <div className="flex h-4 items-center">
                <Bone row={row} className="h-2.5 w-16" />
              </div>
            </div>
            <div className="flex h-5 items-center">
              <Bone row={row} className="h-3 w-14" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

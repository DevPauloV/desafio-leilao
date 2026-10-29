import { Link } from 'react-router';
import { cn } from 'cn';
import { Artwork, MuseumLabel } from '@/components/artwork';
import { LotStatusLabel } from '@/components/lot-status';
import { Bone } from '@/components/skeleton';
import { buttonVariants } from '@/components/ui/button';
import { LotStatus, Role, lotPath } from '@/constants';
import { assetUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatMoney } from '@/lib/money';
import { formatCountdown, formatShortDate } from '@/lib/time';
import type { LotSummary } from '@/types';

/** O Met costuma pôr nome original e série entre parênteses depois do título. */
const shortTitle = (title: string) => title.split(' (')[0];

export function LotCard({ lot, now }: { lot: LotSummary; now: number }) {
  const { user } = useAuth();
  const hasBids = lot.bidCount > 0;
  const unsold = lot.status === LotStatus.ENDED && !hasBids;
  let value: string;
  let valueCaption: string | null;
  let timeCaption: string;
  let when: string;
  let action: string;
  if (lot.status === LotStatus.LIVE) {
    value = formatMoney(lot.currentBid ?? lot.startingBid, { short: true });
    valueCaption = hasBids ? 'lance atual' : 'lance inicial';
    timeCaption = 'termina em';
    when = formatCountdown(new Date(lot.endsAt).getTime() - now);
    action = user?.role === Role.AUCTIONEER ? 'Acompanhar' : 'Dar lance';
  } else if (lot.status === LotStatus.SCHEDULED) {
    value = formatMoney(lot.startingBid, { short: true });
    valueCaption = 'lance inicial';
    timeCaption = 'começa';
    when = formatShortDate(lot.startsAt);
    action = 'Ver lote';
  } else {
    value = hasBids && lot.currentBid !== null ? formatMoney(lot.currentBid, { short: true }) : 'Sem lances';
    valueCaption = hasBids ? 'arrematado' : null;
    timeCaption = 'encerrou';
    when = formatShortDate(lot.endsAt);
    action = 'Ver resultado';
  }
  const primary = action === 'Dar lance';

  // O card inteiro é o link; o "botão" é só visual para não aninhar elementos interativos.
  return (
    <Link to={lotPath(lot.id)} title={lot.title} className="group grid gap-3 text-inherit no-underline">
      <Artwork src={assetUrl(lot.imageUrl)} alt={lot.title} className="aspect-square" />
      <div className="flex h-5 items-center justify-between gap-2">
        <LotStatusLabel status={lot.status} />
        <span className="truncate text-xs text-muted-foreground">
          {timeCaption} <span className="font-mono tabular-nums">{when}</span>
        </span>
      </div>
      <MuseumLabel
        compact
        artist={lot.artist}
        title={shortTitle(lot.title)}
        meta={[lot.date, lot.medium].filter(Boolean).join(' · ') || lot.department}
      />
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className={cn('leading-7 font-semibold tabular-nums', unsold ? 'text-base' : 'text-xl')}>{value}</div>
          <div className="h-4 text-xs leading-4 text-muted-foreground">{valueCaption}</div>
        </div>
        {hasBids && (
          <div className="text-[13px] leading-4 text-muted-foreground tabular-nums">
            {lot.bidCount} {lot.bidCount === 1 ? 'lance' : 'lances'}
          </div>
        )}
      </div>
      <span
        className={cn(
          buttonVariants({ variant: primary ? 'default' : 'outline', size: 'sm' }),
          'w-full',
          primary ? 'group-hover:bg-primary/90' : 'group-hover:bg-muted',
        )}
      >
        {action}
      </span>
    </Link>
  );
}

const SKELETON_CARDS = 3;

/** Mesmas alturas do LotCard (obra, status, etiqueta, preço e botão): quando os lotes chegam, nada muda de lugar. */
export function LotGridSkeleton() {
  return (
    <div role="status" aria-label="Carregando lotes" className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: SKELETON_CARDS }, (_, row) => (
        <div key={row} className="grid gap-3">
          <Bone row={row} className="aspect-square rounded-[10px] bg-wall" />
          <div className="flex h-5 items-center justify-between">
            <Bone row={row} className="h-3 w-16" />
            <Bone row={row} className="h-3 w-24" />
          </div>
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
          <div className="grid">
            <div className="flex h-7 items-center">
              <Bone row={row} className="h-5 w-24 rounded-md" />
            </div>
            <div className="flex h-4 items-center">
              <Bone row={row} className="h-2.5 w-16" />
            </div>
          </div>
          <Bone row={row} className="h-8 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

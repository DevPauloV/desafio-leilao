import { Link } from 'react-router';
import { cn } from 'cn';
import { Artwork } from '@/components/artwork';
import { LotStatusLabel } from '@/components/lot-status';
import { MuseumLabel } from '@/components/museum-label';
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

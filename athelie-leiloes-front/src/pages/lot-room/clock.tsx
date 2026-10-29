import { cn } from 'cn';
import { LotStatus } from '@/constants';
import { isClosing } from '@/lib/lot-room';
import { formatCountdown, formatShortDate } from '@/lib/time';
import type { LotDetail } from '@/types';
import { priceLabel } from './price-label';

export function Clock({ lot, now }: { lot: LotDetail; now: number }) {
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

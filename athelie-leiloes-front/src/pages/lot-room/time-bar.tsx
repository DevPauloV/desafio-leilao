import { cn } from 'cn';
import { isClosing } from '@/lib/lot-room';
import type { LotDetail } from '@/types';

/** Quanto do pregão já passou; fica bordô na janela do anti-sniping. */
export function TimeBar({ lot, now }: { lot: LotDetail; now: number }) {
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

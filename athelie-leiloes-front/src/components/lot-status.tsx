import { cn } from 'cn';
import { LotStatus } from '@/constants';

const LABELS: Record<LotStatus, string> = {
  [LotStatus.LIVE]: 'Ao vivo',
  [LotStatus.SCHEDULED]: 'Agendado',
  [LotStatus.ENDED]: 'Encerrado',
  [LotStatus.CANCELLED]: 'Cancelado',
};

export function LotStatusLabel({ status }: { status: LotStatus }) {
  const live = status === LotStatus.LIVE;
  const hollow = status === LotStatus.ENDED || status === LotStatus.CANCELLED;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[11.5px] font-semibold tracking-[0.08em] uppercase',
        live ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-1.75 rounded-full',
          hollow ? 'border-[1.5px] border-current' : 'bg-current',
          live && 'motion-safe:animate-live',
        )}
      />
      {LABELS[status]}
    </span>
  );
}

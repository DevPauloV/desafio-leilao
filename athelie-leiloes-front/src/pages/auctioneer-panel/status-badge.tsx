import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import { LotStatus } from '@/constants';
import type { MyLot } from '@/types';
import type { LotView } from './my-lot-view';

export function StatusBadge({ lot, view }: { lot: MyLot; view: LotView }) {
  return (
    <Badge variant={view.variant} className="h-6 gap-1.5">
      <span aria-hidden="true" className={cn('size-1.5 rounded-full bg-current', lot.status === LotStatus.LIVE && 'motion-safe:animate-live')} />
      {view.status}
    </Badge>
  );
}

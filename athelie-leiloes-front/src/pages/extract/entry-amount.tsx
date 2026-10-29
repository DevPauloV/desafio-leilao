import { cn } from 'cn';
import { formatMoney } from '@/lib/money';
import type { WalletEntry } from '@/types';
import { ENTRY_VIEW } from './entry-view';

export function EntryAmount({ entry }: { entry: WalletEntry }) {
  const view = ENTRY_VIEW[entry.type];
  return (
    <span className="grid flex-none justify-items-end">
      <span className={cn('font-mono font-semibold tabular-nums', view.amountClassName)}>
        {view.sign}
        {formatMoney(entry.amount)}
      </span>
      <span className="text-[11.5px] text-muted-foreground">{view.caption}</span>
    </span>
  );
}

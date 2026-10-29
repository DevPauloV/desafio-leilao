import { cn } from 'cn';
import { formatMoney } from '@/lib/money';

export function Amount({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div>
      <dt className="text-[12.5px] text-muted-foreground">{label}</dt>
      <dd className={cn('text-[34px] leading-[1.1] font-bold tracking-tight tabular-nums', className)}>
        {formatMoney(value, { short: true })}
      </dd>
    </div>
  );
}

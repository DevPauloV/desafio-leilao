import { cn } from 'cn';
import { Bone } from '@/components/skeleton';
import { formatMoney } from '@/lib/money';
import type { Wallet } from '@/types';

/** Os três saldos de agora, para o histórico abaixo ter referência. */
export function ExtractSummary({ wallet }: { wallet: Wallet | null }) {
  const items = [
    { label: 'Saldo total', value: wallet?.balance },
    { label: 'Comprometido', value: wallet?.committed },
    { label: 'Disponível', value: wallet?.available, className: 'text-win' },
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 *:first:col-span-2 sm:flex sm:gap-x-10 sm:*:first:col-span-1">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className={cn('text-xl font-bold tracking-tight tabular-nums sm:text-2xl', item.className)}>
            {item.value === undefined ? <Bone className="mt-1 h-5 w-24" /> : formatMoney(item.value, { short: true })}
          </dd>
        </div>
      ))}
    </dl>
  );
}

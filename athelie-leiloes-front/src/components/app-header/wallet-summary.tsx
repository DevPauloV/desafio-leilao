import { cn } from 'cn';
import { formatMoney } from '@/lib/money';
import type { Wallet } from '@/types';

export function WalletSummary({ wallet, className }: { wallet: Wallet; className?: string }) {
  const availablePercent = wallet.balance > 0 ? (wallet.available / wallet.balance) * 100 : 0;
  const committedPercent = wallet.balance > 0 ? (wallet.committed / wallet.balance) * 100 : 0;
  return (
    <div className={cn('grid gap-2.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-muted-foreground">Saldo total</span>
        <span className="text-lg font-extrabold tracking-[-0.01em] tabular-nums">{formatMoney(wallet.balance)}</span>
      </div>
      <div
        role="img"
        aria-label={`${Math.round(availablePercent)}% disponível, ${Math.round(committedPercent)}% em lances`}
        className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-border"
      >
        <div className="bg-primary" style={{ width: `${availablePercent}%` }} />
        <div className="bg-warn/60" style={{ width: `${committedPercent}%` }} />
      </div>
      <dl className="grid grid-cols-2 gap-2">
        <div className="grid gap-0.5">
          <dt className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
            Disponível
          </dt>
          <dd className="text-[14.5px] font-bold tabular-nums">{formatMoney(wallet.available)}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <span aria-hidden="true" className="size-2 rounded-full bg-warn/60" />
            Em lances
          </dt>
          <dd className="text-[14.5px] font-semibold text-warn tabular-nums">{formatMoney(wallet.committed)}</dd>
        </div>
      </dl>
    </div>
  );
}

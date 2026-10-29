import { Link } from 'react-router';
import { cn } from 'cn';
import { ChevronDownIcon, LogOutIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROLE_LABELS, ROUTES } from '@/constants';
import { formatMoney } from '@/lib/money';
import type { User, Wallet } from '@/types';
import { ThemeChoice } from './theme-menu';

const shortName = (name: string) => name.trim().split(/\s+/).slice(0, 2).join(' ');

export function WalletBalance({ wallet }: { wallet: Wallet }) {
  return (
    <Link
      to={ROUTES.WALLET}
      aria-label={`Carteira: ${formatMoney(wallet.available)} disponível`}
      className="grid min-h-11 content-center justify-items-end gap-0.5 px-2 text-foreground no-underline md:px-0"
    >
      <span className="text-[9.5px] font-semibold tracking-[0.16em] text-muted-foreground uppercase md:text-[10.5px]">
        Saldo<span className="hidden md:inline"> disponível</span>
      </span>
      <span className="text-[13.5px] font-semibold tabular-nums md:text-[15px]">{formatMoney(wallet.available)}</span>
    </Link>
  );
}

export function AccountMenu({ user, wallet, onLogout }: { user: User; wallet: Wallet | null; onLogout: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Menu da conta de ${shortName(user.name)}`}
          className="group hidden min-h-11 items-center gap-2 rounded-sm text-sm font-semibold text-foreground outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 md:flex"
        >
          {shortName(user.name)}
          <ChevronDownIcon
            aria-hidden="true"
            className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-73 rounded-xl p-1.5 shadow-xl">
        <div className="grid gap-0.5 px-2.5 pt-2.5 pb-3">
          <span className="text-sm leading-tight font-bold">{user.name}</span>
          <span className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
        </div>

        {wallet && <WalletSummary wallet={wallet} className="mx-1 mb-1 rounded-lg bg-background p-3" />}

        <DropdownMenuSeparator className="my-1.5" />
        <ThemeChoice />

        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem variant="destructive" onSelect={onLogout} className="min-h-9 gap-2.5 rounded-lg px-2.5 text-[13.5px] font-semibold">
          <LogOutIcon />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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

import { Link } from 'react-router';
import { cn } from 'cn';
import { ChevronDownIcon, LogOutIcon, PlusIcon, WalletIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DEPOSIT_PATH, ROLE_LABELS, ROUTES } from '@/constants';
import { formatMoney } from '@/lib/money';
import type { User, Wallet } from '@/types';
import { ThemeChoice } from './theme-menu';

const shortName = (name: string) => name.trim().split(/\s+/).slice(0, 2).join(' ');

const initials = (name: string) =>
  shortName(name)
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase();

export function WalletPill({ wallet }: { wallet: Wallet }) {
  return (
    <div className="hidden h-9.5 items-center overflow-hidden rounded-lg border bg-card md:flex">
      <Link
        to={ROUTES.WALLET}
        title="Carteira"
        aria-label={`Carteira: ${formatMoney(wallet.available)} disponível`}
        className="flex h-full items-center gap-2 pr-3 pl-3.5 text-foreground no-underline transition-colors hover:bg-muted"
      >
        <WalletIcon className="size-4 text-primary" aria-hidden="true" />
        <span className="text-[13.5px] font-bold tabular-nums">{formatMoney(wallet.available)}</span>
      </Link>
      <Link
        to={DEPOSIT_PATH}
        title="Depositar"
        aria-label="Depositar"
        className="flex h-full w-9 items-center justify-center border-l text-primary transition-colors hover:bg-muted"
      >
        <PlusIcon className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

function Initials({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('flex shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground', className)}
    >
      {initials(name)}
    </span>
  );
}

export function AccountMenu({ user, wallet, onLogout }: { user: User; wallet: Wallet | null; onLogout: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Menu da conta de ${shortName(user.name)}`}
          className="group flex size-11 items-center justify-center gap-2 rounded-full border bg-card md:rounded-lg text-foreground transition-shadow outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:border-primary data-[state=open]:ring-3 data-[state=open]:ring-primary/15 md:h-10.5 md:w-auto md:py-0 md:pr-3 md:pl-1"
        >
          <Initials name={user.name} className="size-9 text-[13px] md:size-8 md:text-[12.5px]" />
          <span className="hidden text-[13.5px] font-semibold md:inline">{shortName(user.name)}</span>
          <ChevronDownIcon
            aria-hidden="true"
            className="hidden size-3.75 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 md:block"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[calc(100vw-2rem)] rounded-[14px] p-2 shadow-xl md:w-73 md:rounded-xl md:p-1.5">
        <div className="flex items-center gap-3 px-2.5 pt-2.5 pb-3">
          <Initials name={user.name} className="size-11 text-[15px]" />
          <div className="grid min-w-0 gap-0.5">
            <span className="text-[15px] leading-tight font-bold md:text-sm">{user.name}</span>
            <span className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
          </div>
        </div>

        {wallet && <WalletSummary wallet={wallet} />}

        <div className="md:hidden">
          <DropdownMenuSeparator className="my-1.5" />
          <ThemeChoice />
        </div>

        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem
          variant="destructive"
          onSelect={onLogout}
          className="min-h-11 gap-2.5 rounded-lg px-3 text-[15px] font-semibold md:min-h-9 md:px-2.5 md:text-[13.5px]"
        >
          <LogOutIcon />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WalletSummary({ wallet }: { wallet: Wallet }) {
  const availablePercent = wallet.balance > 0 ? (wallet.available / wallet.balance) * 100 : 0;
  const committedPercent = wallet.balance > 0 ? (wallet.committed / wallet.balance) * 100 : 0;
  return (
    <div className="mx-0.5 mb-1 grid gap-2.5 rounded-[10px] bg-background p-3.5 md:mx-1 md:rounded-lg md:p-3">
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
      <DropdownMenuItem
        asChild
        className="h-11 justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-primary-foreground focus:bg-primary/90 focus:text-primary-foreground md:hidden"
      >
        <Link to={DEPOSIT_PATH} className="no-underline">
          <PlusIcon />
          Depositar
        </Link>
      </DropdownMenuItem>
    </div>
  );
}

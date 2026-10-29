import { ChevronDownIcon, LogOutIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROLE_LABELS } from '@/constants';
import type { User, Wallet } from '@/types';
import { ThemeChoice } from './theme-choice';
import { WalletSummary } from './wallet-summary';

const shortName = (name: string) => name.trim().split(/\s+/).slice(0, 2).join(' ');

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

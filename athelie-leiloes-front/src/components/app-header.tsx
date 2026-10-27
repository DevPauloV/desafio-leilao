import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { cn } from 'cn';
import {
  AwardIcon,
  ChevronDownIcon,
  GavelIcon,
  LayoutGridIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  PlusIcon,
  SunIcon,
  WalletIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DEPOSIT_PATH, ROLE_LABELS, ROUTES, Role, SocketEvent, Theme } from '@/constants';
import { logout, useAuth } from '@/lib/auth';
import { formatMoney } from '@/lib/money';
import { socket } from '@/lib/socket';
import { setTheme, useTheme, type ResolvedTheme } from '@/lib/theme';
import { loadWallet, useWallet } from '@/lib/wallet';
import type { User, Wallet } from '@/types';

const THEME_OPTIONS: { value: ResolvedTheme; label: string; icon: LucideIcon }[] = [
  { value: Theme.LIGHT, label: 'Claro', icon: SunIcon },
  { value: Theme.DARK, label: 'Escuro', icon: MoonIcon },
];

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };

function navItems(role: Role | undefined): NavItem[] {
  const items: NavItem[] = [{ to: ROUTES.SHOWCASE, label: 'Vitrine', icon: LayoutGridIcon, end: true }];
  if (role === Role.BIDDER) {
    items.push({ to: ROUTES.MY_BIDS, label: 'Meus arremates', icon: AwardIcon }, { to: ROUTES.WALLET, label: 'Carteira', icon: WalletIcon });
  }
  if (role === Role.AUCTIONEER) items.push({ to: ROUTES.AUCTIONEER_PANEL, label: 'Painel do leiloeiro', icon: GavelIcon });
  return items;
}

const shortName = (name: string) => name.trim().split(/\s+/).slice(0, 2).join(' ');
const initials = (name: string) =>
  shortName(name)
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase();

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'border-b-2 py-0.5 no-underline transition-colors',
    isActive ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
  );

export function AppHeader() {
  const { user, loading } = useAuth();
  const { wallet } = useWallet();
  const isBidder = user?.role === Role.BIDDER;
  const items = navItems(user?.role);

  // Também a cada (re)conexão do socket: um `wallet:update` pode ter saído com a conexão caída ou a aba oculta.
  useEffect(() => {
    if (!isBidder) return;
    const reload = () => void loadWallet();
    reload();
    socket.on(SocketEvent.CONNECT, reload);
    return () => {
      socket.off(SocketEvent.CONNECT, reload);
    };
  }, [isBidder, user?.id]);

  // Recarga, não navigate: a rota protegida veria "sem usuário" antes e mandaria para /entrar; e limpa a memória.
  function handleLogout() {
    logout();
    window.location.replace(ROUTES.SHOWCASE);
  }

  return (
    <header className="sticky top-0 z-40 flex items-center gap-2.5 border-b bg-background/95 py-2.5 backdrop-blur md:gap-7 md:pt-5.5 md:pb-4.5">
      <MobileNav items={items} />

      <Link to={ROUTES.SHOWCASE} className="flex items-baseline gap-1.5 text-foreground no-underline md:gap-2">
        <b className="text-2xl leading-none font-extrabold tracking-[-0.03em] text-primary md:text-[28px]">Athelie</b>
        <span className="text-[10px] font-semibold tracking-[0.26em] text-muted-foreground uppercase md:text-[11px] md:tracking-[0.28em]">
          Leilões
        </span>
      </Link>

      <nav aria-label="Navegação do app" className="hidden flex-1 gap-x-4.5 text-sm md:flex">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2.5 text-[13px]">
        <ThemeButton className={user ? 'hidden md:flex' : undefined} />
        {loading ? null : user ? (
          <>
            {isBidder && wallet && <WalletPill wallet={wallet} />}
            <AccountMenu user={user} wallet={isBidder ? wallet : null} onLogout={handleLogout} />
          </>
        ) : (
          <>
            <Button asChild variant="ghost" size="sm" className="h-9.5 px-4 text-[13.5px]">
              <Link to={ROUTES.LOGIN}>Entrar</Link>
            </Button>
            <Button asChild size="sm" className="hidden h-9.5 px-4.5 text-[13.5px] sm:inline-flex">
              <Link to={ROUTES.REGISTER}>Criar conta</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

function ThemeButton({ className }: { className?: string }) {
  const { resolved } = useTheme();
  const [current, next] = resolved === Theme.LIGHT ? THEME_OPTIONS : [...THEME_OPTIONS].reverse();
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn('size-9.5 bg-card', className)}
      onClick={() => setTheme(next.value)}
      aria-label={`Tema: ${current.label.toLowerCase()}. Trocar para ${next.label.toLowerCase()}`}
      title={`Trocar para tema ${next.label.toLowerCase()}`}
    >
      <current.icon />
    </Button>
  );
}

function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          className="-ml-1.5 size-11 data-[state=open]:border-border data-[state=open]:bg-card md:hidden [&_svg:not([class*='size-'])]:size-5.5"
        >
          {open ? <XIcon /> : <MenuIcon />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={10} className="w-[calc(100vw-2rem)] rounded-[14px] p-2 shadow-xl md:hidden">
        <nav aria-label="Navegação do app" className="grid gap-0.5">
          {items.map((item) => (
            // O Slot junta className como texto; o estilo ativo vem do aria-current do NavLink.
            <DropdownMenuItem
              key={item.to}
              asChild
              className="min-h-12 gap-3 rounded-lg px-3.5 text-[15px] text-foreground no-underline aria-[current=page]:bg-accent aria-[current=page]:font-bold aria-[current=page]:text-accent-foreground [&_svg:not([class*='size-'])]:size-4.5"
            >
              <NavLink to={item.to} end={item.end}>
                <item.icon />
                {item.label}
              </NavLink>
            </DropdownMenuItem>
          ))}
        </nav>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WalletPill({ wallet }: { wallet: Wallet }) {
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

function AccountMenu({ user, wallet, onLogout }: { user: User; wallet: Wallet | null; onLogout: () => void }) {
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

function ThemeChoice() {
  const { resolved } = useTheme();
  return (
    <div className="grid gap-1.5 px-1 pt-1.5 pb-2">
      <span className="px-1.5 text-xs text-muted-foreground">Tema</span>
      <div role="group" aria-label="Tema" className="grid grid-cols-2 gap-0.5 rounded-[10px] bg-muted p-0.75">
        {THEME_OPTIONS.map((option) => {
          const active = option.value === resolved;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setTheme(option.value)}
              className={cn(
                'flex h-10 items-center justify-center gap-1.5 rounded-lg text-[13.5px] transition-colors',
                active ? 'bg-card font-semibold text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <option.icon className="size-3.75" aria-hidden="true" />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

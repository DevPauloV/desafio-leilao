import { useEffect } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { ROUTES, Role, SocketEvent } from '@/constants';
import { logout, useAuth } from '@/lib/auth';
import { socket } from '@/lib/socket';
import { loadWallet, useWallet } from '@/lib/wallet';
import { AccountMenu, WalletPill } from './account-menu';
import { DesktopNav, MobileNav } from './nav';
import { navItems } from './nav-items';
import { ThemeButton } from './theme-menu';

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

      <DesktopNav items={items} />

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

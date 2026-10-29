import { useEffect } from 'react';
import { Link } from 'react-router';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { DEPOSIT_PATH, ROUTES, Role, SocketEvent } from '@/constants';
import { logout, useAuth } from '@/lib/auth';
import { socket } from '@/lib/socket';
import { loadWallet, useWallet } from '@/lib/wallet';
import { AccountMenu, WalletBalance } from './account-menu';
import { DesktopNav, MobileNav, ctaClass, navLinkClass } from './nav';
import { navItems } from './nav-items';
import { ThemeButton } from './theme-menu';
import { Wordmark } from './wordmark';

export function AppHeader() {
  const { user, loading } = useAuth();
  const { wallet } = useWallet();
  const isBidder = user?.role === Role.BIDDER;
  const items = navItems(user?.role);
  const bidderWallet = isBidder ? wallet : null;

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
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/95 backdrop-blur md:h-22 md:gap-16">
      <Wordmark />
      <DesktopNav items={items} />

      <div className="ml-auto flex items-center gap-1 md:gap-7">
        {loading ? null : user ? (
          <>
            {bidderWallet && (
              <>
                <WalletBalance wallet={bidderWallet} />
                <Button asChild className={cn(ctaClass, 'hidden md:inline-flex')}>
                  <Link to={DEPOSIT_PATH}>Depositar</Link>
                </Button>
              </>
            )}
            <AccountMenu user={user} wallet={bidderWallet} onLogout={handleLogout} />
          </>
        ) : (
          <>
            <ThemeButton className="hidden md:flex" />
            <Link to={ROUTES.LOGIN} className={cn(navLinkClass, 'px-2 py-3.5 md:px-0')}>
              Entrar
            </Link>
            <Button asChild className={cn(ctaClass, 'hidden md:inline-flex')}>
              <Link to={ROUTES.REGISTER}>Criar conta</Link>
            </Button>
          </>
        )}
        <MobileNav items={items} user={user} wallet={bidderWallet} onLogout={handleLogout} />
      </div>
    </header>
  );
}

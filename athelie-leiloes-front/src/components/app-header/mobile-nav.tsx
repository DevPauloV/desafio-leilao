import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { cn } from 'cn';
import { Dialog } from 'radix-ui';
import { LogOutIcon, MenuIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEPOSIT_PATH, ROLE_LABELS, ROUTES } from '@/constants';
import type { User, Wallet } from '@/types';
import { ctaClass, navLinkClass } from './nav-classes';
import type { NavItem } from './nav-items';
import { ThemeChoice } from './theme-choice';
import { WalletSummary } from './wallet-summary';
import { Wordmark } from './wordmark';

type MobileNavProps = { items: NavItem[]; user: User | null; wallet: Wallet | null; onLogout: () => void };

export function MobileNav({ items, user, wallet, onLogout }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Abrir menu" className="-mr-2 size-11 md:hidden [&_svg:not([class*='size-'])]:size-5.5">
          <MenuIcon />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        {/* No Radix é o Overlay que trava a rolagem da página por trás. */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background md:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto overscroll-contain bg-background px-4 pb-6 data-[state=open]:animate-in data-[state=open]:fade-in-0 md:hidden"
        >
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <div className="flex h-16 shrink-0 items-center justify-between border-b">
            <Dialog.Close asChild>
              <Wordmark />
            </Dialog.Close>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Fechar menu" className="-mr-2 size-11 [&_svg:not([class*='size-'])]:size-5.5">
                <XIcon />
              </Button>
            </Dialog.Close>
          </div>

          {user && (
            <div className="grid gap-0.5 pt-7">
              <span className="text-lg font-bold">{user.name}</span>
              <span className="text-[13px] text-muted-foreground">{ROLE_LABELS[user.role]}</span>
            </div>
          )}

          {wallet && (
            <div className="mt-5 grid gap-4 border-y py-4.5">
              <WalletSummary wallet={wallet} />
              <Dialog.Close asChild>
                <Button asChild className={cn(ctaClass, 'h-12')}>
                  <Link to={DEPOSIT_PATH}>Depositar</Link>
                </Button>
              </Dialog.Close>
            </div>
          )}

          <nav aria-label="Navegação do app" className="mt-3 grid">
            {items.map((item) => (
              <Dialog.Close key={item.to} asChild>
                <NavLink to={item.to} end={item.end} className={cn(navLinkClass, 'border-b py-4.5 text-[13px]')}>
                  {item.label}
                </NavLink>
              </Dialog.Close>
            ))}
          </nav>

          {!user && (
            <div className="mt-7 grid gap-3">
              <Dialog.Close asChild>
                <Button asChild className={cn(ctaClass, 'h-12')}>
                  <Link to={ROUTES.REGISTER}>Criar conta</Link>
                </Button>
              </Dialog.Close>
              <Dialog.Close asChild>
                <Button asChild variant="outline" className={cn(ctaClass, 'h-12 border-foreground')}>
                  <Link to={ROUTES.LOGIN}>Entrar</Link>
                </Button>
              </Dialog.Close>
            </div>
          )}

          <div className="mt-auto grid gap-2 pt-8">
            <ThemeChoice />
            {user && (
              <Button type="button" variant="ghost" onClick={onLogout} className="h-11 justify-start gap-2.5 px-2 text-destructive hover:text-destructive">
                <LogOutIcon />
                Sair
              </Button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

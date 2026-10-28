import { useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { cn } from 'cn';
import { MenuIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { NavItem } from './nav-items';

// O sublinhado da aba ativa é um traço só, que desliza entre os links (DesktopNav).
const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'border-b-2 border-transparent py-0.5 no-underline transition-colors',
    isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
  );

export function DesktopNav({ items }: { items: NavItem[] }) {
  const navRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);

  // Mede de novo quando a fonte carrega e quando a janela muda (abaixo de md o menu some e a largura vira 0).
  useLayoutEffect(() => {
    const measure = () => {
      const active = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
      setBar(active ? { left: active.offsetLeft, width: active.offsetWidth } : null);
    };
    measure();
    void document.fonts.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [pathname, items.length]);

  return (
    <nav ref={navRef} aria-label="Navegação do app" className="relative hidden flex-1 gap-x-4.5 text-sm md:flex">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
          {item.label}
        </NavLink>
      ))}
      {bar && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-0.5 bg-primary transition-[transform,width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: bar.width, transform: `translateX(${bar.left}px)` }}
        />
      )}
    </nav>
  );
}

export function MobileNav({ items }: { items: NavItem[] }) {
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

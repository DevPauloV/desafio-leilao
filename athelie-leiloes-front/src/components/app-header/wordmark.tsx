import type { ComponentProps } from 'react';
import { Link } from 'react-router';
import { ROUTES } from '@/constants';

// Repassa as props para o Dialog.Close (asChild) do menu do celular fechar ao tocar no logo.
export function Wordmark(props: Omit<ComponentProps<typeof Link>, 'to' | 'className'>) {
  return (
    <Link {...props} to={ROUTES.SHOWCASE} className="flex items-baseline gap-3.5 text-primary no-underline">
      <span className="font-display text-[26px] leading-none font-medium tracking-[0.22em] uppercase md:text-[34px] md:tracking-[0.24em]">
        Athelie
      </span>
      <span className="hidden text-[10px] font-semibold tracking-[0.36em] text-muted-foreground uppercase md:inline">Leilões</span>
    </Link>
  );
}

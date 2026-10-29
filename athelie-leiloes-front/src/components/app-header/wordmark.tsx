import type { ComponentProps } from 'react';
import { Link } from 'react-router';
import { cn } from 'cn';
import { ROUTES } from '@/constants';

// Repassa as props para o Dialog.Close (asChild) do menu do celular fechar ao tocar no logo.
export function Wordmark({ compact, ...props }: Omit<ComponentProps<typeof Link>, 'to' | 'className'> & { compact?: boolean }) {
  return (
    <Link {...props} to={ROUTES.SHOWCASE} className="flex items-baseline gap-3.5 text-primary no-underline">
      <span
        className={cn(
          'font-display leading-none font-medium uppercase',
          compact ? 'text-[22px] tracking-[0.22em]' : 'text-[26px] tracking-[0.22em] md:text-[34px] md:tracking-[0.24em]',
        )}
      >
        Athelie
      </span>
      <span className="hidden text-[10px] font-semibold tracking-[0.36em] text-muted-foreground uppercase md:inline">Leilões</span>
    </Link>
  );
}

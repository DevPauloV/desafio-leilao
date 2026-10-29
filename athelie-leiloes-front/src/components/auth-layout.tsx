import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from 'cn';
import { ArrowRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';

// No celular a tela inteira cabe na altura visível (100dvh menos cabeçalho e respiro do shell), sem rolar:
// o "ver leilões" fica preso embaixo; em telas baixas a descrição e o "ou" somem primeiro.
export function AuthLayout({
  title,
  description,
  top,
  aside,
  footer,
  wide,
  children,
}: {
  title: string;
  description?: string;
  top?: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col pt-5 md:min-h-[calc(100dvh-9rem)] md:justify-center md:py-12">
      <div
        className={cn(
          'mx-auto grid w-full max-w-100 flex-1 grid-rows-[auto_auto_1fr] gap-x-16 gap-y-5 [grid-template-areas:"main"_"aside"_"guest"] md:flex-none md:grid-rows-none',
          wide && 'md:max-w-160',
          aside && 'md:max-w-215 md:grid-cols-[400px_minmax(0,1fr)] md:[grid-template-areas:"main_aside"_"guest_aside"]',
        )}
      >
        <div className="grid content-start gap-4 [grid-area:main] md:gap-5">
          {top}
          <div className="grid gap-1">
            <h1 className="text-[clamp(28px,4.4vw,40px)] leading-[1.08] font-bold tracking-tight text-balance">{title}</h1>
            {description && <p className="text-sm text-muted-foreground [@media(max-height:640px)]:hidden">{description}</p>}
          </div>
          {children}
          {footer && <p className="text-center text-sm text-muted-foreground">{footer}</p>}
        </div>
        {aside && <div className="[grid-area:aside] md:self-start">{aside}</div>}
        <div className="grid gap-3 self-end pb-1 [grid-area:guest] md:self-start">
          <span className="flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border [@media(max-height:640px)]:hidden">
            ou
          </span>
          <Button asChild variant="outline" className="h-11">
            <Link to={ROUTES.SHOWCASE}>
              Ver leilões sem entrar <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

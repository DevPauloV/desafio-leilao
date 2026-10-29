import type { ReactNode } from 'react';
import { Dialog } from 'radix-ui';
import { cn } from 'cn';
import { ArrowLeftIcon, ListFilterIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Celular: botão só com ícone e contador; abre os filtros em tela cheia e aplica na hora. */
export function FiltersScreen({
  activeCount,
  backLabel,
  resultLabel,
  onClear,
  children,
}: {
  activeCount: number;
  backLabel: string;
  resultLabel: string;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={activeCount ? `Filtros, ${activeCount} ativos` : 'Filtros'}
          className={cn('relative size-9 shrink-0 bg-card px-0', activeCount > 0 && 'border-primary text-primary')}
        >
          <ListFilterIcon aria-hidden="true" />
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-primary px-1 font-mono text-[10.5px] text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 grid grid-rows-[auto_1fr_auto] bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] data-[state=open]:animate-page-in"
        >
          <header className="flex items-center gap-2 border-b px-2 py-2">
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="icon-lg" aria-label={backLabel}>
                <ArrowLeftIcon aria-hidden="true" />
              </Button>
            </Dialog.Close>
            <Dialog.Title className="flex-1 text-[17px] font-bold">Filtros</Dialog.Title>
            {activeCount > 0 && (
              <Button type="button" variant="link" onClick={onClear}>
                Limpar
              </Button>
            )}
          </header>
          <div className="overflow-y-auto px-5 py-5">{children}</div>
          <footer className="border-t px-4 py-3">
            <Dialog.Close asChild>
              <Button type="button" className="h-11 w-full text-[15px]">
                {resultLabel}
              </Button>
            </Dialog.Close>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

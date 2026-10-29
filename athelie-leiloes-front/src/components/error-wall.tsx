import { RotateCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyFrame } from './empty-frame';
import { WALL, WALL_TITLE } from './wall-classes';

/** Falha ao carregar uma página: a mesma parede, com a moldura caída e um botão para tentar de novo. */
export function ErrorWall({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <div role="alert" className={WALL}>
      <EmptyFrame fallen />
      <h2 className={WALL_TITLE}>{title}</h2>
      <p className="max-w-[46ch] text-sm text-muted-foreground">{message}</p>
      <Button type="button" className="mt-1.5" onClick={onRetry}>
        <RotateCwIcon aria-hidden="true" />
        Tentar de novo
      </Button>
    </div>
  );
}

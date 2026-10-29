import { Link } from 'react-router';
import { cn } from 'cn';
import { ShieldCheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LotStatus, auditPath, lotPath } from '@/constants';
import type { MyLot } from '@/types';
import { canCancel } from './my-lot-view';

export function LotActions({ lot, onCancel, className }: { lot: MyLot; onCancel: (lot: MyLot) => void; className?: string }) {
  return (
    <div className={cn('flex items-center justify-end gap-2', className)}>
      {lot.status === LotStatus.LIVE && (
        <Button asChild size="sm" className="max-sm:flex-1">
          <Link to={lotPath(lot.id)}>Abrir sala</Link>
        </Button>
      )}
      {canCancel(lot) && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive hover:border-destructive/50 hover:bg-destructive-soft hover:text-destructive"
          onClick={() => onCancel(lot)}
          aria-label={`Cancelar o lote ${lot.title}`}
        >
          Cancelar
        </Button>
      )}
      <Button asChild size="icon" variant="outline" className="text-muted-foreground hover:text-primary">
        <Link to={auditPath(lot.id)} aria-label={`Auditoria do lote ${lot.title}`} title="Auditoria do lote">
          <ShieldCheckIcon />
        </Link>
      </Button>
    </div>
  );
}

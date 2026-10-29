import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from 'cn';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { LotStatus } from '@/constants';
import { api, errorMessage } from '@/lib/api';
import type { MyLot } from '@/types';
import { CancelLotDialog } from './cancel-lot-dialog';
import { LotActions } from './lot-actions';
import { LotTitle } from './lot-title';
import { describe } from './my-lot-view';
import { MyLotsHeader } from './my-lots-header';
import { StatusBadge } from './status-badge';

/** Tabela no desktop e lista compacta no celular, com os mesmos dados e ações. */
export function MyLotsTable({ lots, now, onChanged }: { lots: MyLot[]; now: number; onChanged: () => void }) {
  const [confirming, setConfirming] = useState<MyLot | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Fecha o modal também no erro (ex.: o lote encerrou enquanto ele estava aberto); o toast explica e a lista é relida.
  async function cancel(lot: MyLot) {
    setCancelling(true);
    try {
      const { refunded } = await api<{ refunded: boolean }>(`/api/lots/${lot.id}/cancel`, { method: 'POST' });
      toast.success(refunded ? 'Lote cancelado e lance estornado' : 'Lote cancelado', { description: lot.title });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCancelling(false);
      setConfirming(null);
      onChanged();
    }
  }

  return (
    <>
      <div className="hidden rounded-[10px] border bg-card md:block">
        <Table className="text-sm">
          <MyLotsHeader />
          <TableBody>
            {lots.map((lot) => {
              const view = describe(lot, now);
              return (
                <TableRow key={lot.id} className={cn(lot.status === LotStatus.CANCELLED && 'opacity-60')}>
                  <TableCell className="max-w-90 whitespace-normal">
                    <LotTitle lot={lot} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge lot={lot} view={view} />
                  </TableCell>
                  <TableCell className={cn('text-muted-foreground', view.clock && 'font-mono tabular-nums')}>{view.when}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{lot.bidCount}</TableCell>
                  <TableCell className="text-right">
                    <div className={cn('font-mono font-semibold tabular-nums', view.valueClassName)}>{view.value}</div>
                    <div className="text-[11.5px] text-muted-foreground">{view.caption}</div>
                  </TableCell>
                  <TableCell>
                    <LotActions lot={lot} onCancel={setConfirming} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y rounded-[10px] border bg-card md:hidden">
        {lots.map((lot) => {
          const view = describe(lot, now);
          return (
            <li key={lot.id} className={cn('grid gap-3 p-3.5', lot.status === LotStatus.CANCELLED && 'opacity-60')}>
              <div className="flex items-start justify-between gap-3">
                <LotTitle lot={lot} />
                <div className="grid flex-none justify-items-end gap-1">
                  <StatusBadge lot={lot} view={view} />
                  <span className={cn('font-mono text-[13px] font-semibold tabular-nums', view.valueClassName)}>{view.value}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5">
                <span className={cn('flex-1 text-[12.5px] whitespace-nowrap text-muted-foreground', view.clock && 'font-mono tabular-nums')}>
                  {view.when} · {lot.bidCount} {lot.bidCount === 1 ? 'lance' : 'lances'}
                </span>
                <LotActions lot={lot} onCancel={setConfirming} />
              </div>
            </li>
          );
        })}
      </ul>
      <CancelLotDialog lot={confirming} cancelling={cancelling} onConfirm={cancel} onClose={() => setConfirming(null)} />
    </>
  );
}

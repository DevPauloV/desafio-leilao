import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ShieldCheckIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from 'cn';
import { Artwork, MuseumLabel } from '@/components/artwork';
import { LotStatusLabel } from '@/components/lot-status';
import { Bone } from '@/components/skeleton';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LotStatus, auditPath, lotPath } from '@/constants';
import { api, assetUrl, errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import type { MyLot } from '@/types';

export function MyLotsTable({ lots, onChanged }: { lots: MyLot[]; onChanged: () => void }) {
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
    <div className="rounded-[10px] border bg-card">
      <Table className="min-w-160 text-sm">
        <MyLotsHeader />
        <TableBody>
          {lots.map((lot) => {
            const open = lot.status === LotStatus.LIVE || lot.status === LotStatus.SCHEDULED;
            const canCancel = open;
            const refund = lot.bidCount > 0 && lot.currentBid !== null;
            return (
              <TableRow key={lot.id}>
                <TableCell className="whitespace-normal">
                  <div className="flex items-center gap-3">
                    <Artwork src={assetUrl(lot.imageUrl)} alt="" thin className="w-11 flex-none" />
                    <MuseumLabel
                      title={
                        <Link to={lotPath(lot.id)} className="underline-offset-4 hover:text-primary hover:underline">
                          {lot.title}
                        </Link>
                      }
                      meta={lot.artist}
                      titleClassName="text-base"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <LotStatusLabel status={lot.status} />
                </TableCell>
                <TableCell className="tabular-nums">{lot.bidCount}</TableCell>
                <TableCell className="tabular-nums">
                  <ResultCell lot={lot} />
                </TableCell>
                <TableCell className="whitespace-normal">
                  <div className="flex items-center justify-end gap-2">
                    {canCancel && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirming(lot)}
                        aria-label={`${refund ? 'Cancelar e estornar' : 'Cancelar'} o lote ${lot.title}`}
                      >
                        {refund ? 'Cancelar e estornar' : 'Cancelar'}
                      </Button>
                    )}
                    <Button asChild size="icon" variant="outline" className="text-muted-foreground hover:text-primary">
                      <Link to={auditPath(lot.id)} aria-label={`Auditoria do lote ${lot.title}`} title="Auditoria do lote">
                        <ShieldCheckIcon />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <CancelLotDialog lot={confirming} cancelling={cancelling} onConfirm={cancel} onClose={() => setConfirming(null)} />
    </div>
  );
}

function CancelLotDialog({
  lot,
  cancelling,
  onConfirm,
  onClose,
}: {
  lot: MyLot | null;
  cancelling: boolean;
  onConfirm: (lot: MyLot) => void;
  onClose: () => void;
}) {
  const refund = lot !== null && lot.bidCount > 0 && lot.currentBid !== null;
  return (
    <AlertDialog open={lot !== null} onOpenChange={(open) => !open && !cancelling && onClose()}>
      <AlertDialogContent className="gap-4.5 p-5.5 sm:max-w-md">
        <div className="grid gap-1">
          <span className="text-[11px] font-bold tracking-[0.16em] text-primary uppercase">Cancelamento</span>
          <AlertDialogTitle className="text-xl font-extrabold tracking-[-0.02em]">
            {refund ? 'Cancelar e estornar o lote?' : 'Cancelar o lote?'}
          </AlertDialogTitle>
        </div>
        {lot && (
          <div className="flex items-center gap-3.5 rounded-[10px] bg-background p-3">
            <Artwork src={assetUrl(lot.imageUrl)} alt="" thin className="w-16 flex-none" />
            <div className="grid min-w-0 gap-1">
              <MuseumLabel artist={lot.artist} title={lot.title} titleClassName="text-[17px]" compact />
              <span className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                <LotStatusLabel status={lot.status} />·
                <span>{lot.bidCount === 0 ? 'Sem lances' : `${lot.bidCount} ${lot.bidCount === 1 ? 'lance' : 'lances'}`}</span>
              </span>
            </div>
          </div>
        )}
        <AlertDialogDescription asChild>
          <ul className="grid gap-2 text-sm text-pretty text-muted-foreground">
            <CancelConsequence>O lote sai da vitrine e não recebe mais lances.</CancelConsequence>
            {refund && (
              <CancelConsequence money>
                O lance de <b className="font-semibold text-foreground">{formatMoney(lot.currentBid ?? 0)}</b> volta na hora para o
                saldo disponível do líder.
              </CancelConsequence>
            )}
            <CancelConsequence>Essa ação não pode ser desfeita.</CancelConsequence>
          </ul>
        </AlertDialogDescription>
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <AlertDialogCancel disabled={cancelling}>Manter lote</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={cancelling}
            onClick={() => lot && onConfirm(lot)}
            className="bg-destructive text-primary-foreground hover:bg-destructive/90"
          >
            {cancelling ? 'Cancelando…' : refund ? 'Sim, cancelar e estornar' : 'Sim, cancelar'}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** `money`: marca em bordô o item do estorno, o que mexe com o saldo de alguém. */
function CancelConsequence({ money = false, children }: { money?: boolean; children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span aria-hidden="true" className={cn('mt-2 size-1.5 flex-none rounded-full', money ? 'bg-primary' : 'bg-border')} />
      <span>{children}</span>
    </li>
  );
}

function MyLotsHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Lote</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Lances</TableHead>
        <TableHead>Resultado</TableHead>
        <TableHead>
          <span className="sr-only">Ações</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}

const SKELETON_ROWS = 3;

/** Mesma tabela de MyLotsTable, com blocos no lugar de cada célula. */
export function MyLotsSkeleton() {
  return (
    <div role="status" aria-label="Carregando seus lotes" className="rounded-[10px] border bg-card">
      <Table className="min-w-160 text-sm">
        <MyLotsHeader />
        <TableBody>
          {Array.from({ length: SKELETON_ROWS }, (_, row) => (
            <TableRow key={row}>
              {/* Na tabela real, os títulos alargam esta coluna; sem a largura, as outras pulariam para a direita. */}
              <TableCell className="w-1/2">
                <div className="flex items-center gap-3">
                  <Bone row={row} className="aspect-4/5 w-11 flex-none rounded-md bg-wall" />
                  <div className="grid flex-1 gap-2">
                    <Bone row={row} className="h-3.5 w-3/5" />
                    <Bone row={row} className="h-3 w-2/5" />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Bone row={row} className="h-3 w-18" />
              </TableCell>
              <TableCell>
                <Bone row={row} className="h-3 w-4" />
              </TableCell>
              <TableCell>
                <Bone row={row} className="h-3 w-30" />
              </TableCell>
              <TableCell>
                <Bone row={row} className="ml-auto h-8 w-24 rounded-md" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ResultCell({ lot }: { lot: MyLot }) {
  if (lot.status === LotStatus.ENDED) {
    if (!lot.result) return <span className="text-muted-foreground">Apurando resultado…</span>;
    if (lot.result.sold && lot.result.amount !== null) {
      return <Badge variant="accent">Arrematado por {formatMoney(lot.result.amount, { short: true })}</Badge>;
    }
    return <Badge variant="neutral">Sem lances</Badge>;
  }
  if (lot.status !== LotStatus.CANCELLED && lot.currentBid !== null) {
    return <>Lance atual {formatMoney(lot.currentBid, { short: true })}</>;
  }
  return <span className="text-muted-foreground">—</span>;
}

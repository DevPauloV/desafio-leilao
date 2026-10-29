import { Artwork } from '@/components/artwork';
import { LotStatusLabel } from '@/components/lot-status';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MuseumLabel } from '@/components/museum-label';
import { Button } from '@/components/ui/button';
import { assetUrl } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import type { MyLot } from '@/types';
import { CancelConsequence } from './cancel-consequence';

export function CancelLotDialog({
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

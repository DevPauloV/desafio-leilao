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
import { formatCountdown, formatShortDate } from '@/lib/time';
import type { MyLot } from '@/types';

type LotView = {
  status: string;
  variant: 'accent' | 'neutral' | 'win';
  when: string;
  clock: boolean;
  value: string;
  caption: string;
  valueClassName?: string;
};

/** O que cada linha mostra, conforme a situação do lote. */
function describe(lot: MyLot, now: number): LotView {
  const money = (cents: number) => formatMoney(cents, { short: true });
  switch (lot.status) {
    case LotStatus.LIVE:
      return {
        status: 'Ao vivo',
        variant: 'accent',
        when: `Faltam ${formatCountdown(new Date(lot.endsAt).getTime() - now)}`,
        clock: true,
        value: money(lot.currentBid ?? lot.startingBid),
        caption: lot.currentBid === null ? 'lance inicial' : 'lance atual',
      };
    case LotStatus.SCHEDULED:
      return { status: 'Agendado', variant: 'neutral', when: `Abre ${formatShortDate(lot.startsAt)}`, clock: false, value: money(lot.startingBid), caption: 'lance inicial' };
    case LotStatus.ENDED: {
      const when = `Encerrou ${formatShortDate(lot.endsAt)}`;
      if (!lot.result) return { status: 'Encerrado', variant: 'neutral', when, clock: false, value: '—', caption: 'apurando resultado' };
      if (lot.result.sold && lot.result.amount !== null) {
        return { status: 'Arrematado', variant: 'win', when, clock: false, value: money(lot.result.amount), caption: 'recebido', valueClassName: 'text-win' };
      }
      return { status: 'Sem lances', variant: 'neutral', when, clock: false, value: money(lot.startingBid), caption: 'não vendido', valueClassName: 'text-muted-foreground' };
    }
    case LotStatus.CANCELLED:
      return {
        status: 'Cancelado',
        variant: 'neutral',
        when: `Fim previsto ${formatShortDate(lot.endsAt)}`,
        clock: false,
        value: money(lot.currentBid ?? lot.startingBid),
        caption: lot.currentBid === null ? 'sem lances' : 'estornado',
        valueClassName: 'text-muted-foreground',
      };
  }
}

const canCancel = (lot: MyLot) => lot.status === LotStatus.LIVE || lot.status === LotStatus.SCHEDULED;

function StatusBadge({ lot, view }: { lot: MyLot; view: LotView }) {
  return (
    <Badge variant={view.variant} className="h-6 gap-1.5">
      <span aria-hidden="true" className={cn('size-1.5 rounded-full bg-current', lot.status === LotStatus.LIVE && 'motion-safe:animate-live')} />
      {view.status}
    </Badge>
  );
}

function LotActions({ lot, onCancel }: { lot: MyLot; onCancel: (lot: MyLot) => void }) {
  return (
    <div className="flex items-center justify-end gap-2">
      {lot.status === LotStatus.LIVE && (
        <Button asChild size="sm">
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

function LotTitle({ lot }: { lot: MyLot }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Artwork src={assetUrl(lot.imageUrl)} alt="" thin className="w-11 flex-none" />
      <MuseumLabel
        compact
        title={
          <Link to={lotPath(lot.id)} className="underline-offset-4 hover:text-primary hover:underline">
            {lot.title}
          </Link>
        }
        meta={lot.artist}
        titleClassName="text-[15px]"
      />
    </div>
  );
}

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
        <TableHead>Quando</TableHead>
        <TableHead className="text-right">Lances</TableHead>
        <TableHead className="text-right">Valor</TableHead>
        <TableHead>
          <span className="sr-only">Ações</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}

const SKELETON_ROWS = 4;

/** Mesmo contorno da lista real, com blocos no lugar de cada linha. */
export function MyLotsSkeleton() {
  return (
    <div role="status" aria-label="Carregando seus lotes" className="divide-y rounded-[10px] border bg-card">
      {Array.from({ length: SKELETON_ROWS }, (_, row) => (
        <div key={row} className="flex items-center gap-3 p-3.5 md:px-4">
          <Bone row={row} className="aspect-4/5 w-11 flex-none rounded-md bg-wall" />
          <div className="grid flex-1 gap-2">
            <Bone row={row} className="h-3.5 w-3/5 md:w-2/5" />
            <Bone row={row} className="h-3 w-2/5 md:w-1/5" />
          </div>
          <Bone row={row} className="hidden h-6 w-22 rounded-full md:block" />
          <Bone row={row} className="h-4 w-20" />
          <Bone row={row} className="hidden h-8 w-8 rounded-md md:block" />
        </div>
      ))}
    </div>
  );
}

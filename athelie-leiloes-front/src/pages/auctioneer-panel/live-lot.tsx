import { Link } from 'react-router';
import { cn } from 'cn';
import { Artwork } from '@/components/artwork';
import { ANTI_SNIPING_WINDOW_MS, lotPath } from '@/constants';
import { assetUrl } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { formatCountdown, formatShortDate, formatTime } from '@/lib/time';
import type { MyLot } from '@/types';
import { LotActions } from './lot-actions';

export function LiveLot({ lot, now, onCancel }: { lot: MyLot; now: number; onCancel: (lot: MyLot) => void }) {
  const start = new Date(lot.startsAt).getTime();
  const end = new Date(lot.endsAt).getTime();
  const left = end - now;
  const elapsed = Math.min(1, Math.max(0, (now - start) / (end - start)));
  // Na janela do anti-sniping, um lance prorroga o fim: o relógio muda de cor para avisar.
  const closing = left <= ANTI_SNIPING_WINDOW_MS;
  const hasBids = lot.currentBid !== null;

  return (
    <li className="grid content-start gap-2.5 rounded-[10px] border bg-card p-3.5">
      <div className="flex items-center gap-3">
        <Artwork src={assetUrl(lot.imageUrl)} alt="" thin className="w-14 flex-none" />
        <div className="grid min-w-0 flex-1 gap-px">
          <Link to={lotPath(lot.id)} className="truncate text-[15.5px] font-bold underline-offset-4 hover:text-primary hover:underline">
            {lot.title}
          </Link>
          {lot.artist && <span className="truncate text-[12.5px] text-muted-foreground">{lot.artist}</span>}
        </div>
        <div className="grid flex-none gap-0 text-right">
          <span className="text-[11.5px] text-muted-foreground">Faltam</span>
          <span className={cn('font-mono text-lg font-semibold tabular-nums', closing && 'text-warn')}>{formatCountdown(left)}</span>
        </div>
      </div>
      <div className="grid gap-1.5">
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${elapsed * 100}%` }} />
        </div>
        <div className="flex justify-between gap-3 text-[11.5px] text-muted-foreground">
          <span>Abriu {formatShortDate(lot.startsAt)}</span>
          <span>Termina {formatTime(lot.endsAt)}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2.5">
        <div className="flex items-baseline gap-2">
          <div className="grid gap-0">
            <span className="text-[11.5px] text-muted-foreground">{hasBids ? 'Lance atual' : 'Lance inicial'}</span>
            <span className="font-mono text-lg font-semibold tabular-nums">{formatMoney(lot.currentBid ?? lot.startingBid, { short: true })}</span>
          </div>
          <span className="text-[11.5px] text-muted-foreground">
            {lot.bidCount === 0 ? 'Sem lances ainda' : `${lot.bidCount} ${lot.bidCount === 1 ? 'lance' : 'lances'}`}
          </span>
        </div>
        <LotActions lot={lot} onCancel={onCancel} className="max-sm:w-full" />
      </div>
    </li>
  );
}

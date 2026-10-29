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
    <li className="grid gap-4 rounded-[10px] border bg-card p-4 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:px-5">
      <div className="flex min-w-0 flex-[1_1_340px] items-center gap-4">
      <Artwork src={assetUrl(lot.imageUrl)} alt="" thin className="w-14 flex-none sm:w-22" />
      <div className="grid min-w-0 flex-1 gap-3">
        <div className="grid min-w-0 gap-px">
          <Link to={lotPath(lot.id)} className="truncate text-[17px] font-bold underline-offset-4 hover:text-primary hover:underline">
            {lot.title}
          </Link>
          {lot.artist && <span className="truncate text-[13px] text-muted-foreground">{lot.artist}</span>}
        </div>
        <div className="grid gap-1.5">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${elapsed * 100}%` }} />
          </div>
          <div className="flex justify-between gap-3 text-xs text-muted-foreground">
            <span>Abriu {formatShortDate(lot.startsAt)}</span>
            <span>Termina {formatTime(lot.endsAt)}</span>
          </div>
        </div>
      </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 sm:flex sm:gap-x-8">
        <div className="grid gap-0.5 sm:min-w-30">
          <dt className="text-xs text-muted-foreground">Faltam</dt>
          <dd className={cn('font-mono text-xl font-semibold tabular-nums sm:text-2xl', closing && 'text-warn')}>{formatCountdown(left)}</dd>
        </div>
        <div className="grid gap-0.5 sm:min-w-34">
          <dt className="text-xs text-muted-foreground">{hasBids ? 'Lance atual' : 'Lance inicial'}</dt>
          <dd className="font-mono text-xl font-semibold tabular-nums">{formatMoney(lot.currentBid ?? lot.startingBid, { short: true })}</dd>
          <dd className="text-xs text-muted-foreground">
            {lot.bidCount === 0 ? 'Sem lances ainda' : `${lot.bidCount} ${lot.bidCount === 1 ? 'lance' : 'lances'}`}
          </dd>
        </div>
      </dl>
      <LotActions lot={lot} onCancel={onCancel} />
    </li>
  );
}

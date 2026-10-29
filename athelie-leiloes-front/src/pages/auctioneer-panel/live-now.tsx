import { Link } from 'react-router';
import { cn } from 'cn';
import { ShieldCheckIcon } from 'lucide-react';
import { Artwork } from '@/components/artwork';
import { Button } from '@/components/ui/button';
import { ANTI_SNIPING_WINDOW_MS, auditPath, lotPath } from '@/constants';
import { assetUrl } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { formatCountdown, formatShortDate, formatTime } from '@/lib/time';
import type { MyLot } from '@/types';

/** Lotes ao vivo em destaque, o que termina antes primeiro. */
export function LiveNow({ lots, now }: { lots: MyLot[]; now: number }) {
  const sorted = [...lots].sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());
  return (
    <section aria-labelledby="live-now-heading" className="grid grid-cols-1 gap-3">
      <h2 id="live-now-heading" className="flex items-center gap-2 text-[13px] font-semibold tracking-widest text-primary uppercase">
        <span aria-hidden="true" className="size-1.75 rounded-full bg-current motion-safe:animate-live" />
        Acontecendo agora
      </h2>
      <ul className="grid gap-3">
        {sorted.map((lot) => (
          <LiveLot key={lot.id} lot={lot} now={now} />
        ))}
      </ul>
    </section>
  );
}

function LiveLot({ lot, now }: { lot: MyLot; now: number }) {
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
      <div className="flex gap-2 max-sm:w-full">
        <Button asChild size="sm" className="max-sm:flex-1">
          <Link to={lotPath(lot.id)}>Abrir sala</Link>
        </Button>
        <Button asChild size="icon" variant="outline" className="text-muted-foreground hover:text-primary">
          <Link to={auditPath(lot.id)} aria-label={`Auditoria do lote ${lot.title}`} title="Auditoria do lote">
            <ShieldCheckIcon />
          </Link>
        </Button>
      </div>
    </li>
  );
}

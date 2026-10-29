import { useState } from 'react';
import { CheckIcon } from 'lucide-react';
import { cn } from 'cn';
import { Link } from 'react-router';
import { Paddle } from '@/components/paddle';
import { BID_HISTORY_INITIAL, BID_HISTORY_STEP, LotStatus, auditPath } from '@/constants';
import { formatMoney } from '@/lib/money';
import { formatRelative } from '@/lib/time';
import type { LotDetail } from '@/types';

const MORE_BUTTON = 'text-[13px] font-semibold text-primary underline-offset-4 hover:underline';

/** Mostra os lances mais recentes e cresce de BID_HISTORY_STEP em BID_HISTORY_STEP a pedido, para a sala não virar uma rolagem enorme. */
export function BidHistory({ lot, now, isMine }: { lot: LotDetail; now: number; isMine: (pseudonym: string) => boolean }) {
  const [visible, setVisible] = useState(BID_HISTORY_INITIAL);
  const shown = lot.bids.slice(0, visible);
  const hidden = lot.bids.length - shown.length;
  const next = Math.min(BID_HISTORY_STEP, hidden);

  return (
    <section aria-labelledby="history-heading" className="-mx-5.5 -mb-5.5 grid border-t pb-2.5">
      <div className="flex items-center justify-between gap-3 px-5.5 pt-3.5 pb-1.5">
        <h2 id="history-heading" className="inline-flex items-center gap-2 text-sm font-bold">
          {lot.status === LotStatus.LIVE && <span aria-hidden="true" className="size-1.75 rounded-full bg-primary motion-safe:animate-live" />}
          Lances
        </h2>
        <Link to={auditPath(lot.id)} className="text-[13px] font-semibold text-primary underline-offset-4 hover:underline">
          Auditar histórico
        </Link>
      </div>
      <ol aria-live="polite" className="grid">
        {shown.map((bid, index) => (
          <li
            key={bid.seq}
            className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5.5 py-1.5', index === 0 && 'bg-primary/7')}
          >
            <div className="grid min-w-0">
              <Paddle pseudonym={bid.pseudonym} mine={isMine(bid.pseudonym)} />
              <time dateTime={bid.createdAt} className="pl-4.5 text-[11.5px] leading-4 text-muted-foreground">
                {formatRelative(bid.createdAt, now)}
              </time>
            </div>
            <div className="grid justify-items-end">
              <span className="text-sm font-bold tabular-nums">{formatMoney(bid.amount)}</span>
              <span className="inline-flex items-center gap-1 text-[11px] leading-4 font-semibold text-win">
                <CheckIcon aria-hidden="true" className="size-3" />
                registrado
              </span>
            </div>
          </li>
        ))}
      </ol>
      {lot.bids.length === 0 && <p className="px-5.5 py-3 text-sm text-muted-foreground">Nenhum lance ainda.</p>}
      {(hidden > 0 || visible > BID_HISTORY_INITIAL) && (
        <div className="flex items-center justify-between gap-3 border-t px-5.5 pt-3">
          {hidden > 0 ? (
            <button type="button" onClick={() => setVisible((count) => count + BID_HISTORY_STEP)} className={MORE_BUTTON}>
              Ver mais {next} {next === 1 ? 'lance' : 'lances'}
            </button>
          ) : (
            <span />
          )}
          {visible > BID_HISTORY_INITIAL && (
            <button type="button" onClick={() => setVisible(BID_HISTORY_INITIAL)} className="text-[13px] text-muted-foreground underline-offset-4 hover:underline">
              Mostrar menos
            </button>
          )}
        </div>
      )}
      {hidden <= 0 && lot.bidCount > lot.bids.length && (
        <p className="mx-5.5 mt-3 border-t pt-3 text-[12.5px] text-muted-foreground">
          Mostrando os {lot.bids.length} lances mais recentes de {lot.bidCount}. A auditoria mostra todos.
        </p>
      )}
    </section>
  );
}

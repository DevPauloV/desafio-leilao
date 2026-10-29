import { useState } from 'react';
import { cn } from 'cn';
import type { MyLot } from '@/types';
import { LiveLot } from './live-lot';
import { LIVE_SORT_OPTIONS, LiveSort, sortLive } from './live-sort';

/** Quantos lotes ao vivo aparecem antes do "ver os outros". */
const VISIBLE_LIVE = 4;

/** Lotes ao vivo em destaque, em grade; por padrão o que termina antes vem primeiro. */
export function LiveNow({ lots, now, onCancel }: { lots: MyLot[]; now: number; onCancel: (lot: MyLot) => void }) {
  const [sort, setSort] = useState<LiveSort>(LiveSort.ENDING);
  const [expanded, setExpanded] = useState(false);
  const sorted = sortLive(lots, sort);
  const shown = expanded ? sorted : sorted.slice(0, VISIBLE_LIVE);
  const hidden = sorted.length - VISIBLE_LIVE;

  return (
    <section aria-labelledby="live-now-heading" className="grid grid-cols-1 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
        <h2 id="live-now-heading" className="flex items-center gap-2 text-[13px] font-semibold tracking-widest text-primary uppercase">
          <span aria-hidden="true" className="size-1.75 rounded-full bg-current motion-safe:animate-live" />
          Acontecendo agora
          <span className="rounded-full bg-primary px-2 font-mono text-[11.5px] tracking-normal text-primary-foreground">{lots.length}</span>
        </h2>
        <div role="group" aria-label="Ordenar lotes ao vivo" className="flex overflow-hidden rounded-[8px] border bg-card max-sm:w-full">
          {LIVE_SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={sort === option.value}
              onClick={() => setSort(option.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold text-muted-foreground outline-offset-2 max-sm:flex-1',
                sort === option.value && 'bg-muted text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {shown.map((lot) => (
          <LiveLot key={lot.id} lot={lot} now={now} onCancel={onCancel} />
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
          className="h-9.5 rounded-[9px] border border-dashed bg-card text-[13px] font-bold text-primary hover:border-primary"
        >
          {expanded ? `Mostrar só os primeiros ${VISIBLE_LIVE}` : `Ver os outros ${hidden} ${hidden === 1 ? 'lote ao vivo' : 'lotes ao vivo'}`}
        </button>
      )}
    </section>
  );
}

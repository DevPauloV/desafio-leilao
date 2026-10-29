import { cn } from 'cn';
import type { Facet } from '@/types';

/** Lista de índice de catálogo: um item escolhido por vez, marcado por um ponto bordô. */
export function FacetIndex({
  allLabel,
  items,
  value,
  onSelect,
}: {
  allLabel: string;
  items: Facet[];
  value: string;
  onSelect: (name: string) => void;
}) {
  const rows: { name: string; count?: number }[] = [{ name: '' }, ...items];
  return (
    <ul className="grid">
      {rows.map(({ name, count }) => {
        const on = name === value;
        return (
          <li key={name || allLabel}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(on ? '' : name)}
              className={cn(
                'relative flex w-full items-center justify-between gap-3 py-2 pl-3.5 text-left text-[14px] text-muted-foreground transition-colors hover:text-foreground lg:py-1.25 lg:text-[13.5px]',
                on && 'font-semibold text-foreground',
              )}
            >
              {on && <span aria-hidden="true" className="absolute top-1/2 left-0 size-1.5 -translate-y-1/2 rounded-full bg-primary" />}
              <span className="min-w-0 truncate">{name || allLabel}</span>
              {count !== undefined && <span className="font-mono text-[11.5px] font-normal text-muted-foreground">{count}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

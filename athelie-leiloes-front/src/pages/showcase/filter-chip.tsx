import { XIcon } from 'lucide-react';
import type { ActiveFilter } from './tabs';

export function FilterChip({ filter, onRemove }: { filter: ActiveFilter; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-card py-0.5 pr-1 pl-2.5 text-[12.5px]">
      <span className="text-[11px] text-muted-foreground">{filter.label}</span>
      <span className="truncate">{filter.value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover ${filter.label.toLowerCase()}: ${filter.value}`}
        className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
      >
        <XIcon className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}

import { ArrowRightIcon, XIcon } from 'lucide-react';
import { EmptyWall } from '@/components/empty-wall';
import { Button } from '@/components/ui/button';
import { TABS, resultCount, type Filters, type ShowcaseStatus, type ShowcaseTab } from './tabs';

export function ShowcaseEmpty({
  tab,
  counts,
  filters: { q, department },
  onOpenTab,
  onRemoveQuery,
  onRemoveDepartment,
  onClear,
}: {
  tab: ShowcaseTab;
  counts: Partial<Record<ShowcaseStatus, number>>;
  filters: Filters;
  onOpenTab: (status: ShowcaseStatus) => void;
  onRemoveQuery: () => void;
  onRemoveDepartment: () => void;
  onClear: () => void;
}) {
  const elsewhere = TABS.find((other) => other.status !== tab.status && (counts[other.status] ?? 0) > 0);
  const elsewhereCount = elsewhere ? (counts[elsewhere.status] ?? 0) : 0;

  if (!q && !department) {
    return (
      <EmptyWall title={tab.emptyTitle}>
        <p className="max-w-[46ch] text-sm text-muted-foreground">{tab.emptyText}</p>
        {elsewhere && (
          <Button type="button" className="mt-1.5" onClick={() => onOpenTab(elsewhere.status)}>
            Ver {elsewhere.label.toLowerCase()}
            <span className="font-mono text-[11.5px] opacity-80">{elsewhereCount}</span>
          </Button>
        )}
      </EmptyWall>
    );
  }

  return (
    <EmptyWall title={tab.filteredTitle} searching>
      <div className="flex flex-wrap justify-center gap-1.5">
        {q && <FilterChip label="Busca" value={q} onRemove={onRemoveQuery} />}
        {department && <FilterChip label="Departamento" value={department} onRemove={onRemoveDepartment} />}
      </div>
      {elsewhere ? (
        <p className="rounded-full bg-primary-soft px-3 py-0.5 text-[13px] font-semibold text-primary">
          {resultCount(elsewhereCount)} em {elsewhere.label}
        </p>
      ) : (
        <p className="max-w-[46ch] text-sm text-muted-foreground">Confira a grafia, busque pelo nome do artista ou tente outro departamento.</p>
      )}
      <div className="mt-1.5 flex flex-wrap justify-center gap-2">
        {elsewhere && (
          <Button type="button" onClick={() => onOpenTab(elsewhere.status)}>
            Ver em {elsewhere.label}
            <ArrowRightIcon aria-hidden="true" />
          </Button>
        )}
        <Button type="button" variant="outline" className="bg-card" onClick={onClear}>
          Limpar filtros
        </Button>
      </div>
    </EmptyWall>
  );
}

function FilterChip({ label, value, onRemove }: { label: string; value: string; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-card py-0.5 pr-1 pl-2.5 text-[12.5px]">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="truncate">{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover ${label.toLowerCase()}: ${value}`}
        className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
      >
        <XIcon className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}

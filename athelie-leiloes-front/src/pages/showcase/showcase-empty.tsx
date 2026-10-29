import { ArrowRightIcon } from 'lucide-react';
import { EmptyWall } from '@/components/empty-wall';
import { Button } from '@/components/ui/button';
import { FilterChip } from './filters';
import { TABS, resultCount, type ActiveFilter, type ShowcaseStatus, type ShowcaseTab } from './tabs';

export function ShowcaseEmpty({
  tab,
  counts,
  active,
  onOpenTab,
  onRemove,
  onClear,
}: {
  tab: ShowcaseTab;
  counts: Partial<Record<ShowcaseStatus, number>>;
  active: ActiveFilter[];
  onOpenTab: (status: ShowcaseStatus) => void;
  onRemove: (filter: ActiveFilter) => void;
  onClear: () => void;
}) {
  const elsewhere = TABS.find((other) => other.status !== tab.status && (counts[other.status] ?? 0) > 0);
  const elsewhereCount = elsewhere ? (counts[elsewhere.status] ?? 0) : 0;

  if (active.length === 0) {
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
        {active.map((filter) => (
          <FilterChip key={filter.label} filter={filter} onRemove={() => onRemove(filter)} />
        ))}
      </div>
      {elsewhere ? (
        <p className="rounded-full bg-primary-soft px-3 py-0.5 text-[13px] font-semibold text-primary">
          {resultCount(elsewhereCount)} em {elsewhere.label}
        </p>
      ) : (
        <p className="max-w-[46ch] text-sm text-muted-foreground">Confira a grafia, busque pelo nome do artista ou afrouxe algum filtro.</p>
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

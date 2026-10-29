import type { Facet } from '@/types';
import { ArtistFilter } from './artist-filter';
import { FacetIndex } from './facet-index';
import { FilterGroup } from './filter-group';
import { PeriodFilter } from './period-filter';
import { PriceFilter } from './price-filter';
import type { Filters, ShowcaseTab } from './tabs';

type FiltersProps = {
  tab: ShowcaseTab;
  filters: Filters;
  departments: Facet[];
  artists: Facet[];
  onChange: (next: Partial<Filters>) => void;
};

/** Seções da coluna de filtros; a mesma lista serve a coluna do desktop e a tela cheia do celular. */
export function ShowcaseFilters({ tab, filters, departments, artists, onChange }: FiltersProps) {
  return (
    <div className="grid gap-7">
      <FilterGroup title="Departamento">
        <FacetIndex
          allLabel="Todos"
          items={departments}
          value={filters.department}
          onSelect={(department) => onChange({ department })}
        />
      </FilterGroup>
      <FilterGroup title="Artista">
        <ArtistFilter artists={artists} value={filters.artist} onSelect={(artist) => onChange({ artist })} />
      </FilterGroup>
      <FilterGroup title={tab.priceLabel}>
        <PriceFilter
          key={`${filters.minPrice}:${filters.maxPrice}`}
          label={tab.priceLabel}
          min={filters.minPrice}
          max={filters.maxPrice}
          onChange={onChange}
        />
      </FilterGroup>
      <FilterGroup title={tab.periodLabel}>
        <PeriodFilter tab={tab} value={filters.period} onChange={(period) => onChange({ period })} />
      </FilterGroup>
    </div>
  );
}

import { useSearchParams } from 'react-router';
import { cn } from 'cn';
import { ErrorWall } from '@/components/error-wall';
import { PageTitle } from '@/components/page-title';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LOTS_PAGE_SIZE, LotStatus, SEARCH_MAX_LENGTH } from '@/constants';
import { FiltersScreen } from '@/components/filters-screen';
import { useServerNow } from '@/hooks/use-server-now';
import { FilterChip } from './filter-chip';
import { LotCard } from './lot-card';
import { LotGridSkeleton } from './lot-grid-skeleton';
import { ShowcaseEmpty } from './showcase-empty';
import { ShowcaseFilters } from './showcase-filters';
import { NO_FILTERS, TABS, activeFilters, type ActiveFilter, type Filters, type ShowcaseStatus } from './tabs';
import { Param, filterParams, filtersFromParams, isShowcaseStatus, withSelected } from './url-filters';
import { useDebouncedSearch } from './use-debounced-search';
import { useShowcaseLots } from './use-showcase-lots';

export function ShowcasePage() {
  const [params, setParams] = useSearchParams();
  const statusParam = params.get(Param.STATUS);
  const status: ShowcaseStatus = isShowcaseStatus(statusParam) ? statusParam : LotStatus.LIVE;
  const tab = TABS.find((candidate) => candidate.status === status) ?? TABS[0];
  const page = Math.max(1, Number(params.get(Param.PAGE)) || 1);
  const filters = filtersFromParams(params);
  const filtersKey = filterParams(filters).toString();
  const { q } = filters;

  const [typed, setTyped] = useDebouncedSearch(q, setParams);
  const { counts, loading, error, data, offset, retry } = useShowcaseLots(status, page, filtersKey, setParams);
  const now = useServerNow(offset);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / LOTS_PAGE_SIZE)) : 1;

  function navigate(next: { status?: ShowcaseStatus; page?: number } & Partial<Filters>) {
    const nextStatus = next.status ?? status;
    const nextPage = next.page ?? 1;
    const query = filterParams({ ...filters, ...next });
    if (nextStatus !== LotStatus.LIVE) query.set(Param.STATUS, nextStatus);
    if (nextPage > 1) query.set(Param.PAGE, String(nextPage));
    setParams(query);
    if (next.page) window.scrollTo({ top: 0 });
  }

  function removeFilter(filter: ActiveFilter) {
    if (filter.clear.q !== undefined) setTyped('');
    navigate(filter.clear);
  }

  // Limpar a coluna mantém a busca digitada; "Limpar filtros" do estado vazio tira tudo.
  const clearPanel = () => navigate({ ...NO_FILTERS, q });
  function clearAll() {
    setTyped('');
    navigate(NO_FILTERS);
  }

  const active = activeFilters(filters, tab);
  const panelFilters = active.filter((filter) => filter.clear.q === undefined);
  const panel = (
    <ShowcaseFilters
      tab={tab}
      filters={filters}
      departments={withSelected(data?.departments ?? [], filters.department)}
      artists={data?.artists ?? []}
      onChange={(next) => navigate(next)}
    />
  );

  return (
    <div className="grid grid-cols-1 gap-7 pt-7">
      <PageTitle eyebrow="Leilão de obras do The Met" title="Obras em leilão" />

      <Tabs value={status} onValueChange={(value) => isShowcaseStatus(value) && navigate({ status: value })} className="gap-7">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
            <TabsList aria-label="Status dos lotes" className="h-auto! w-full rounded-[8px] bg-muted p-0.75 sm:w-fit">
              {TABS.map((option) => (
                <TabsTrigger
                  key={option.status}
                  value={option.status}
                  className="h-auto px-1.5 py-1.5 text-[13px] text-muted-foreground data-active:bg-card data-active:font-semibold data-active:text-foreground sm:px-3 sm:text-[13.5px] dark:data-active:border-transparent dark:data-active:bg-card"
                >
                  {option.label}
                  {counts[option.status] !== undefined && (
                    <span className="ml-1 font-mono text-[11.5px]">{counts[option.status]}</span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-1">
              <Input
                type="search"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                maxLength={SEARCH_MAX_LENGTH}
                placeholder="Buscar por obra ou artista"
                aria-label="Buscar lotes"
                className="h-9 min-w-0 flex-1 sm:max-w-90"
              />
              <div className="lg:hidden">
                <FiltersScreen
                  activeCount={panelFilters.length}
                  backLabel="Voltar para a vitrine"
                  resultLabel={data ? `Ver ${data.total} ${data.total === 1 ? 'obra' : 'obras'}` : 'Ver obras'}
                  onClear={clearPanel}
                >
                  {panel}
                </FiltersScreen>
              </div>
            </div>
          </div>
          {panelFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5 lg:hidden">
              {panelFilters.map((filter) => (
                <FilterChip key={filter.label} filter={filter} onRemove={() => removeFilter(filter)} />
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[13.5rem_minmax(0,1fr)]">
          <aside aria-label="Filtros" className="hidden content-start gap-5 lg:grid">
            <div className="flex h-6 items-baseline justify-between">
              <h2 className="text-[15px] font-bold">Filtros</h2>
              {panelFilters.length > 0 && (
                <button type="button" onClick={clearPanel} className="text-[12.5px] font-semibold text-primary hover:underline">
                  Limpar
                </button>
              )}
            </div>
            {panel}
          </aside>

          {TABS.map((option) => (
            <TabsContent key={option.status} value={option.status} className="grid content-start gap-8 text-[15px]">
              {error ? (
                <ErrorWall title="A vitrine não carregou" message={error} onRetry={retry} />
              ) : !data ? (
                <LotGridSkeleton />
              ) : data.items.length === 0 ? (
                <ShowcaseEmpty
                  tab={option}
                  counts={counts}
                  active={active}
                  onOpenTab={(next) => navigate({ status: next })}
                  onRemove={removeFilter}
                  onClear={clearAll}
                />
              ) : (
                <ul
                  aria-busy={loading}
                  className={cn('grid grid-cols-1 gap-x-6 gap-y-10 transition-opacity sm:grid-cols-2 xl:grid-cols-3', loading && 'opacity-60')}
                >
                  {data.items.map((lot) => (
                    <li key={lot.id} className="grid">
                      <LotCard lot={lot} now={now} />
                    </li>
                  ))}
                </ul>
              )}

              {data && !error && totalPages > 1 && (
                <nav aria-label="Paginação" className="flex items-center gap-3 text-sm">
                  <Button type="button" variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => navigate({ page: page - 1 })}>
                    Anterior
                  </Button>
                  <span className="text-muted-foreground">
                    Página {page} de {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => navigate({ page: page + 1 })}
                  >
                    Próxima
                  </Button>
                </nav>
              )}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { cn } from 'cn';
import { ErrorWall } from '@/components/empty-wall';
import { PageTitle } from '@/components/page-title';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LOTS_PAGE_SIZE, LotPeriod, LotStatus, SEARCH_MAX_LENGTH } from '@/constants';
import { api, errorMessage } from '@/lib/api';
import { clockOffset } from '@/lib/time';
import { useServerNow } from '@/hooks/use-server-now';
import type { Facet, LotPage } from '@/types';
import { FilterChip, FiltersScreen, ShowcaseFilters } from './filters';
import { LotCard, LotGridSkeleton } from './lot-card';
import { ShowcaseEmpty } from './showcase-empty';
import { NO_FILTERS, TABS, activeFilters, type ActiveFilter, type Filters, type ShowcaseStatus } from './tabs';

const isShowcaseStatus = (value: string | null): value is ShowcaseStatus => TABS.some((tab) => tab.status === value);
const isPeriod = (value: string | null): value is LotPeriod => Object.values(LotPeriod).some((period) => period === value);

const SEARCH_DEBOUNCE_MS = 300;

/** O estado da vitrine fica na URL, para compartilhar e voltar com o navegador. Preços em centavos, como na API. */
const Param = {
  STATUS: 'status',
  PAGE: 'page',
  QUERY: 'q',
  DEPARTMENT: 'department',
  ARTIST: 'artist',
  MIN_PRICE: 'minPrice',
  MAX_PRICE: 'maxPrice',
  PERIOD: 'period',
} as const;

function centsParam(value: string | null): number | null {
  const cents = Number(value);
  return value && Number.isInteger(cents) && cents >= 0 ? cents : null;
}

function filtersFromParams(params: URLSearchParams): Filters {
  const period = params.get(Param.PERIOD);
  return {
    q: params.get(Param.QUERY)?.trim() ?? '',
    department: params.get(Param.DEPARTMENT) ?? '',
    artist: params.get(Param.ARTIST) ?? '',
    minPrice: centsParam(params.get(Param.MIN_PRICE)),
    maxPrice: centsParam(params.get(Param.MAX_PRICE)),
    period: isPeriod(period) ? period : null,
  };
}

/** Os mesmos nomes servem à URL da página e à query da API. */
function filterParams({ q, department, artist, minPrice, maxPrice, period }: Filters): URLSearchParams {
  const query = new URLSearchParams();
  if (q) query.set(Param.QUERY, q);
  if (department) query.set(Param.DEPARTMENT, department);
  if (artist) query.set(Param.ARTIST, artist);
  if (minPrice !== null) query.set(Param.MIN_PRICE, String(minPrice));
  if (maxPrice !== null) query.set(Param.MAX_PRICE, String(maxPrice));
  if (period) query.set(Param.PERIOD, period);
  return query;
}

/** `offset` é medido na chegada da resposta: a contagem regressiva continua certa quando ela volta do cache. */
type ShowcaseResponse = { key: string; status: ShowcaseStatus; data?: LotPage; offset?: number; error?: string };

// Voltar à vitrine abre com a última lista na tela enquanto a nova chega. Dados públicos: não depende do usuário.
const lastVisit: {
  response: ShowcaseResponse | null;
  counts: Partial<Record<ShowcaseStatus, number>>;
} = { response: null, counts: {} };

function lotsUrl(status: ShowcaseStatus, filters: Filters, page = 1): string {
  const query = filterParams(filters);
  query.set(Param.STATUS, status);
  query.set(Param.PAGE, String(page));
  return `/api/lots?${query}`;
}

/** Valor escolhido que não está nas contagens da aba (link antigo, outra aba) continua na lista, com zero. */
const withSelected = (items: Facet[], value: string) =>
  value && !items.some((item) => item.name === value) ? [{ name: value, count: 0 }, ...items] : items;

export function ShowcasePage() {
  const [params, setParams] = useSearchParams();
  const statusParam = params.get(Param.STATUS);
  const status: ShowcaseStatus = isShowcaseStatus(statusParam) ? statusParam : LotStatus.LIVE;
  const tab = TABS.find((candidate) => candidate.status === status) ?? TABS[0];
  const page = Math.max(1, Number(params.get(Param.PAGE)) || 1);
  const filters = filtersFromParams(params);
  const filtersKey = filterParams(filters).toString();
  const { q } = filters;

  // O campo só vai para a URL após o debounce, mas acompanha a URL se ela mudar por fora (voltar, "Limpar filtros").
  const [typed, setTyped] = useState(q);
  const [lastUrlQuery, setLastUrlQuery] = useState(q);
  if (q !== lastUrlQuery) {
    setLastUrlQuery(q);
    setTyped(q);
  }

  const [reload, setReload] = useState(0);
  const [counts, setCounts] = useState(lastVisit.counts);
  // A resposta guarda a chave da busca que a gerou: chave diferente da atual = carregando.
  const requestKey = `${status}:${page}:${filtersKey}:${reload}`;
  const [response, setResponse] = useState(lastVisit.response);

  useEffect(() => {
    const controller = new AbortController();
    api<LotPage>(lotsUrl(status, filtersFromParams(new URLSearchParams(filtersKey)), page), { signal: controller.signal }).then(
      (data) => {
        const fresh = { key: requestKey, status, data, offset: clockOffset(data.serverTime) };
        lastVisit.response = fresh;
        setResponse(fresh);
      },
      (err: unknown) => {
        if (!controller.signal.aborted) setResponse({ key: requestKey, status, error: errorMessage(err) });
      },
    );
    return () => controller.abort();
  }, [status, page, filtersKey, requestKey]);

  useEffect(() => {
    const controller = new AbortController();
    const current = filtersFromParams(new URLSearchParams(filtersKey));
    for (const other of TABS) {
      api<LotPage>(lotsUrl(other.status, current), { signal: controller.signal })
        .then((result) => {
          lastVisit.counts = { ...lastVisit.counts, [other.status]: result.total };
          setCounts(lastVisit.counts);
        })
        .catch(() => {}); // contador é opcional; a aba ativa mostra o próprio erro
    }
    return () => controller.abort();
  }, [filtersKey]);

  const current = response?.key === requestKey ? response : null;
  const loading = current === null;
  const error = current?.error ?? null;
  // Enquanto a busca nova carrega, a lista anterior da mesma aba continua na tela (sem piscar).
  const data = current?.data ?? (response?.status === status ? (response.data ?? null) : null);

  const offset = response?.offset ?? 0;
  const now = useServerNow(offset);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / LOTS_PAGE_SIZE)) : 1;

  // Página além da última (link antigo): volta para a última, senão a lista fica vazia e a paginação some.
  const freshTotal = current?.data?.total;
  useEffect(() => {
    if (freshTotal === undefined) return;
    const lastPage = Math.max(1, Math.ceil(freshTotal / LOTS_PAGE_SIZE));
    if (page <= lastPage) return;
    setParams(
      (currentParams) => {
        const next = new URLSearchParams(currentParams);
        if (lastPage > 1) next.set(Param.PAGE, String(lastPage));
        else next.delete(Param.PAGE);
        return next;
      },
      { replace: true },
    );
  }, [freshTotal, page, setParams]);

  function navigate(next: { status?: ShowcaseStatus; page?: number } & Partial<Filters>) {
    const nextStatus = next.status ?? status;
    const nextPage = next.page ?? 1;
    const query = filterParams({ ...filters, ...next });
    if (nextStatus !== LotStatus.LIVE) query.set(Param.STATUS, nextStatus);
    if (nextPage > 1) query.set(Param.PAGE, String(nextPage));
    setParams(query);
    if (next.page) window.scrollTo({ top: 0 });
  }

  // `replace`: não cria uma entrada no histórico a cada pausa na digitação.
  useEffect(() => {
    const term = typed.trim();
    if (term === q) return;
    const timer = setTimeout(() => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (term) next.set(Param.QUERY, term);
          else next.delete(Param.QUERY);
          next.delete(Param.PAGE);
          return next;
        },
        { replace: true },
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [typed, q, setParams]);

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
                <FiltersScreen activeCount={panelFilters.length} total={data?.total ?? null} onClear={clearPanel}>
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
                <ErrorWall title="A vitrine não carregou" message={error} onRetry={() => setReload((n) => n + 1)} />
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

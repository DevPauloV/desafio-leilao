import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { cn } from 'cn';
import { ListFilterIcon } from 'lucide-react';
import { ErrorWall } from '@/components/empty-wall';
import { PageTitle } from '@/components/page-title';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LOTS_PAGE_SIZE, LotStatus, SEARCH_MAX_LENGTH } from '@/constants';
import { api, errorMessage } from '@/lib/api';
import { clockOffset } from '@/lib/time';
import { useServerNow } from '@/hooks/use-server-now';
import type { LotPage } from '@/types';
import { LotCard, LotGridSkeleton } from './lot-card';
import { ShowcaseEmpty } from './showcase-empty';
import { TABS, type Filters, type ShowcaseStatus } from './tabs';

const isShowcaseStatus = (value: string | null): value is ShowcaseStatus => TABS.some((tab) => tab.status === value);

const SEARCH_DEBOUNCE_MS = 300;

/** O estado da vitrine fica na URL, para compartilhar e voltar com o navegador. */
const Param = { STATUS: 'status', PAGE: 'page', QUERY: 'q', DEPARTMENT: 'department' } as const;

/** O Select do Radix não aceita string vazia como valor de item. */
const ALL_DEPARTMENTS = '__all__';

/** `offset` é medido na chegada da resposta: a contagem regressiva continua certa quando ela volta do cache. */
type ShowcaseResponse = { key: string; status: ShowcaseStatus; data?: LotPage; offset?: number; error?: string };

// Voltar à vitrine abre com a última lista na tela enquanto a nova chega. Dados públicos: não depende do usuário.
const lastVisit: {
  response: ShowcaseResponse | null;
  counts: Partial<Record<ShowcaseStatus, number>>;
  departments: string[];
} = { response: null, counts: {}, departments: [] };

function lotsUrl(status: ShowcaseStatus, { q, department }: Filters, page = 1): string {
  const query = new URLSearchParams({ status, page: String(page) });
  if (q) query.set(Param.QUERY, q);
  if (department) query.set(Param.DEPARTMENT, department);
  return `/api/lots?${query}`;
}

export function ShowcasePage() {
  const [params, setParams] = useSearchParams();
  const statusParam = params.get(Param.STATUS);
  const status: ShowcaseStatus = isShowcaseStatus(statusParam) ? statusParam : LotStatus.LIVE;
  const page = Math.max(1, Number(params.get(Param.PAGE)) || 1);
  const q = params.get(Param.QUERY)?.trim() ?? '';
  const department = params.get(Param.DEPARTMENT) ?? '';

  // O campo só vai para a URL após o debounce, mas acompanha a URL se ela mudar por fora (voltar, "Limpar filtros").
  const [typed, setTyped] = useState(q);
  const [lastUrlQuery, setLastUrlQuery] = useState(q);
  if (q !== lastUrlQuery) {
    setLastUrlQuery(q);
    setTyped(q);
  }

  const [reload, setReload] = useState(0);
  const [counts, setCounts] = useState(lastVisit.counts);
  const [departments, setDepartments] = useState(lastVisit.departments);
  // A resposta guarda a chave da busca que a gerou: chave diferente da atual = carregando.
  const requestKey = `${status}:${page}:${q}:${department}:${reload}`;
  const [response, setResponse] = useState(lastVisit.response);

  useEffect(() => {
    const controller = new AbortController();
    api<LotPage>(lotsUrl(status, { q, department }, page), { signal: controller.signal }).then(
      (data) => {
        const fresh = { key: requestKey, status, data, offset: clockOffset(data.serverTime) };
        lastVisit.response = fresh;
        lastVisit.departments = data.departments;
        setResponse(fresh);
        setDepartments(data.departments);
      },
      (err: unknown) => {
        if (!controller.signal.aborted) setResponse({ key: requestKey, status, error: errorMessage(err) });
      },
    );
    return () => controller.abort();
  }, [status, page, q, department, requestKey]);

  useEffect(() => {
    const controller = new AbortController();
    for (const tab of TABS) {
      api<LotPage>(lotsUrl(tab.status, { q, department }), { signal: controller.signal })
        .then((result) => {
          lastVisit.counts = { ...lastVisit.counts, [tab.status]: result.total };
          setCounts(lastVisit.counts);
        })
        .catch(() => {}); // contador é opcional; a aba ativa mostra o próprio erro
    }
    return () => controller.abort();
  }, [q, department]);

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

  function navigate(next: { status?: ShowcaseStatus; page?: number } & Partial<Filters>, replace = false) {
    const nextStatus = next.status ?? status;
    const nextQ = next.q ?? q;
    const nextDepartment = next.department ?? department;
    const nextPage = next.page ?? 1;
    const query = new URLSearchParams();
    if (nextStatus !== LotStatus.LIVE) query.set(Param.STATUS, nextStatus);
    if (nextQ) query.set(Param.QUERY, nextQ);
    if (nextDepartment) query.set(Param.DEPARTMENT, nextDepartment);
    if (nextPage > 1) query.set(Param.PAGE, String(nextPage));
    setParams(query, { replace });
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

  function clearFilters() {
    setTyped('');
    navigate({ q: '', department: '' });
  }

  const departmentOptions = department && !departments.includes(department) ? [department, ...departments] : departments;

  return (
    <div className="grid grid-cols-1 gap-7 pt-7">
      <PageTitle eyebrow="Leilão de obras do The Met" title="Obras em leilão" />

      <Tabs value={status} onValueChange={(value) => isShowcaseStatus(value) && navigate({ status: value })} className="gap-7">
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
          <TabsList aria-label="Status dos lotes" className="h-auto! w-full rounded-[8px] bg-muted p-0.75 sm:w-fit">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.status}
                value={tab.status}
                className="h-auto px-1.5 py-1.5 text-[13px] text-muted-foreground data-active:bg-card data-active:font-semibold data-active:text-foreground sm:px-3 sm:text-[13.5px] dark:data-active:border-transparent dark:data-active:bg-card"
              >
                {tab.label}
                {counts[tab.status] !== undefined && (
                  <span className="ml-1 font-mono text-[11.5px]">{counts[tab.status]}</span>
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
            <Select
              value={department || ALL_DEPARTMENTS}
              onValueChange={(value) => navigate({ department: value === ALL_DEPARTMENTS ? '' : value })}
            >
              <SelectTrigger
                aria-label={department ? `Departamento: ${department}` : 'Filtrar por departamento'}
                title={department || 'Filtrar por departamento'}
                className={cn(
                  'h-9! w-9 shrink-0 justify-center bg-card px-0 text-[13.5px] sm:w-fit sm:justify-between sm:pr-2 sm:pl-2.5 dark:bg-card',
                  '[&>svg:last-child]:hidden sm:[&>svg:last-child]:block',
                  department && 'border-primary text-primary',
                )}
              >
                <ListFilterIcon aria-hidden="true" className={department ? 'text-primary' : 'text-muted-foreground'} />
                <span className="hidden sm:inline">
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent position="popper" align="end" className="max-w-[calc(100vw-2rem)]">
                <SelectItem value={ALL_DEPARTMENTS}>Todos os departamentos</SelectItem>
                {departmentOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {TABS.map((tab) => (
          <TabsContent key={tab.status} value={tab.status} className="grid gap-8 text-[15px]">
            {error ? (
              <ErrorWall title="A vitrine não carregou" message={error} onRetry={() => setReload((n) => n + 1)} />
            ) : !data ? (
              <LotGridSkeleton />
            ) : data.items.length === 0 ? (
              <ShowcaseEmpty
                tab={tab}
                counts={counts}
                filters={{ q, department }}
                onOpenTab={(next) => navigate({ status: next })}
                onRemoveQuery={() => {
                  setTyped('');
                  navigate({ q: '' });
                }}
                onRemoveDepartment={() => navigate({ department: '' })}
                onClear={clearFilters}
              />
            ) : (
              <ul
                aria-busy={loading}
                className={cn(
                  'grid grid-cols-1 gap-x-6 gap-y-10 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
                  loading && 'opacity-60',
                )}
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
      </Tabs>
    </div>
  );
}


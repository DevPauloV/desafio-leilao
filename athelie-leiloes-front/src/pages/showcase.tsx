import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { cn } from 'cn';
import { ArrowRightIcon, ListFilterIcon, XIcon } from 'lucide-react';
import { Artwork, MuseumLabel } from '@/components/artwork';
import { EmptyWall, ErrorWall } from '@/components/empty-wall';
import { LotStatusLabel } from '@/components/lot-status';
import { PageTitle } from '@/components/page-title';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LOTS_PAGE_SIZE, LotStatus, SEARCH_MAX_LENGTH, lotPath } from '@/constants';
import { api, assetUrl, errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { clockOffset, formatCountdown, formatShortDate, useServerNow } from '@/lib/time';
import type { LotPage, LotSummary } from '@/types';

const TABS = [
  {
    status: LotStatus.LIVE,
    label: 'Ao vivo',
    emptyTitle: 'Nenhum leilão acontecendo agora',
    emptyText: 'Quando um lote abrir para lances, ele aparece aqui com a contagem regressiva.',
    filteredTitle: 'Nenhum lote ao vivo com esses filtros',
  },
  {
    status: LotStatus.SCHEDULED,
    label: 'Agendados',
    emptyTitle: 'Nenhum leilão agendado',
    emptyText: 'Novos lotes aparecem aqui assim que um leiloeiro os publica, com a data de abertura.',
    filteredTitle: 'Nenhum lote agendado com esses filtros',
  },
  {
    status: LotStatus.ENDED,
    label: 'Encerrados',
    emptyTitle: 'Nenhum leilão encerrado ainda',
    emptyText: 'Quando um lote termina, o valor de arremate e o histórico de lances auditável ficam aqui.',
    filteredTitle: 'Nenhum lote encerrado com esses filtros',
  },
] as const;
type ShowcaseTab = (typeof TABS)[number];
type ShowcaseStatus = ShowcaseTab['status'];

const isShowcaseStatus = (value: string | null): value is ShowcaseStatus => TABS.some((tab) => tab.status === value);

const SEARCH_DEBOUNCE_MS = 300;
/** O estado da vitrine fica na URL, para compartilhar e voltar com o navegador. */
const Param = { STATUS: 'status', PAGE: 'page', QUERY: 'q', DEPARTMENT: 'department' } as const;
/** O Select do Radix não aceita string vazia como valor de item. */
const ALL_DEPARTMENTS = '__all__';

type Filters = { q: string; department: string };

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
  const [counts, setCounts] = useState<Partial<Record<ShowcaseStatus, number>>>({});
  const [departments, setDepartments] = useState<string[]>([]);
  // A resposta guarda a chave da busca que a gerou: chave diferente da atual = carregando.
  const requestKey = `${status}:${page}:${q}:${department}:${reload}`;
  const [response, setResponse] = useState<{ key: string; status: ShowcaseStatus; data?: LotPage; error?: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api<LotPage>(lotsUrl(status, { q, department }, page), { signal: controller.signal }).then(
      (data) => {
        setResponse({ key: requestKey, status, data });
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
        .then((result) => setCounts((current) => ({ ...current, [tab.status]: result.total })))
        .catch(() => {}); // contador é opcional; a aba ativa mostra o próprio erro
    }
    return () => controller.abort();
  }, [q, department]);

  const current = response?.key === requestKey ? response : null;
  const loading = current === null;
  const error = current?.error ?? null;
  // Enquanto a busca nova carrega, a lista anterior da mesma aba continua na tela (sem piscar).
  const data = current?.data ?? (response?.status === status ? (response.data ?? null) : null);

  const offset = useMemo(() => (data ? clockOffset(data.serverTime) : 0), [data]);
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
                  'grid grid-cols-1 gap-x-8 gap-y-10 transition-opacity sm:grid-cols-2 lg:grid-cols-3',
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

/** O Met costuma pôr nome original e série entre parênteses depois do título. */
const shortTitle = (title: string) => title.split(' (')[0];

const pill = 'inline-flex items-center rounded-full border border-border/70 bg-card/85 px-2.5 py-1 backdrop-blur-sm';

const resultCount = (n: number) => `${n} ${n === 1 ? 'resultado' : 'resultados'}`;

function ShowcaseEmpty({
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

function LotCard({ lot, now }: { lot: LotSummary; now: number }) {
  const hasBids = lot.bidCount > 0;
  const unsold = lot.status === LotStatus.ENDED && !hasBids;
  let value: string;
  let valueCaption: string | null;
  let timeCaption: string;
  let when: string;
  if (lot.status === LotStatus.LIVE) {
    value = formatMoney(lot.currentBid ?? lot.startingBid, { short: true });
    valueCaption = hasBids ? 'lance atual' : 'lance inicial';
    timeCaption = 'Termina em';
    when = formatCountdown(new Date(lot.endsAt).getTime() - now);
  } else if (lot.status === LotStatus.SCHEDULED) {
    value = formatMoney(lot.startingBid, { short: true });
    valueCaption = 'lance inicial';
    timeCaption = 'Começa em';
    when = formatShortDate(lot.startsAt);
  } else {
    value = hasBids && lot.currentBid !== null ? formatMoney(lot.currentBid, { short: true }) : 'Sem lances';
    valueCaption = hasBids ? 'arrematado' : null;
    timeCaption = 'Encerrado em';
    when = formatShortDate(lot.endsAt);
  }

  return (
    <Link to={lotPath(lot.id)} title={lot.title} className="group grid grid-rows-[auto_1fr_auto] gap-4 text-inherit no-underline">
      <Artwork src={assetUrl(lot.imageUrl)} alt={lot.title}>
        <div className="absolute inset-x-3 top-3 flex flex-wrap justify-between gap-2">
          <span className={pill}>
            <LotStatusLabel status={lot.status} />
          </span>
          <span className={cn(pill, 'font-mono text-[12.5px] tabular-nums')}>
            <span className="sr-only">{timeCaption} </span>
            {when}
          </span>
        </div>
      </Artwork>
      <MuseumLabel
        compact
        artist={lot.artist}
        title={shortTitle(lot.title)}
        meta={[lot.date, lot.medium].filter(Boolean).join(' · ') || lot.department}
      />
      <div className="flex items-end justify-between gap-3 border-t pt-3">
        <div>
          <div className={unsold ? 'text-lg leading-[1.1] font-bold' : 'text-2xl leading-[1.1] font-bold tracking-tight tabular-nums'}>
            {value}
          </div>
          {valueCaption && <div className="text-xs text-muted-foreground">{valueCaption}</div>}
        </div>
        {hasBids && (
          <div className="text-sm text-muted-foreground tabular-nums">
            {lot.bidCount} {lot.bidCount === 1 ? 'lance' : 'lances'}
          </div>
        )}
      </div>
    </Link>
  );
}

const SKELETON_CARDS = 3;

function LotGridSkeleton() {
  return (
    <div role="status" aria-label="Carregando lotes" className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: SKELETON_CARDS }, (_, i) => (
        <div key={i} className="grid gap-4">
          <div className="aspect-4/5 animate-pulse rounded-[10px] bg-wall motion-reduce:animate-none" />
          <div className="h-5 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="h-8 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

import { useMemo, useRef, useState } from 'react';
import { cn } from 'cn';
import { EmptyWall, ErrorWall } from '@/components/empty-wall';
import { PageTitle } from '@/components/page-title';
import { Bone } from '@/components/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LOCALE, LotStatus, SocketEvent } from '@/constants';
import { useAuth } from '@/lib/auth';
import { usePageData } from '@/hooks/use-page-data';
import { useServerNow } from '@/hooks/use-server-now';
import { useSocketEvent } from '@/hooks/use-socket-event';
import { formatMoney } from '@/lib/money';
import { clockOffset } from '@/lib/time';
import type { MetArtwork, MyLot, MyLotsResponse } from '@/types';
import { LiveNow } from './live-now';
import { ALL_STATUSES, LotsFilter, type StatusFilter } from './lots-filter';
import { MetSearch } from './met-search';
import { MyLotsSkeleton, MyLotsTable } from './my-lots-table';
import { NewLotForm } from './new-lot-form';

const PanelTab = { LOTS: 'lots', NEW: 'new' } as const;
type PanelTab = (typeof PanelTab)[keyof typeof PanelTab];
const isPanelTab = (value: string): value is PanelTab => Object.values(PanelTab).some((tab) => tab === value);

function matchesFilter(lot: MyLot, status: StatusFilter, query: string): boolean {
  if (status !== ALL_STATUSES && lot.status !== status) return false;
  const needle = query.trim().toLocaleLowerCase(LOCALE);
  return !needle || [lot.title, lot.artist ?? ''].some((text) => text.toLocaleLowerCase(LOCALE).includes(needle));
}

/** Mesmo ponto do `lg:` do Tailwind, onde busca e formulário ficam lado a lado. */
const WIDE_LAYOUT = '(min-width: 64rem)';

const TAB_TRIGGER =
  'h-auto flex-none px-4 py-2 text-[14px] text-muted-foreground data-active:bg-card data-active:font-semibold data-active:text-foreground dark:data-active:border-transparent dark:data-active:bg-card';

export function AuctioneerPanelPage() {
  const { user } = useAuth();
  const { data: mine, error: mineError, reload: reloadMine } = usePageData<MyLotsResponse>('/api/me/lots');
  const [tab, setTab] = useState<PanelTab>(PanelTab.LOTS);
  const [selected, setSelected] = useState<MetArtwork | null>(null);
  const [status, setStatus] = useState<StatusFilter>(ALL_STATUSES);
  const [query, setQuery] = useState('');
  const formRef = useRef<HTMLElement>(null);
  // Memoizado: `clockOffset` lê Date.now(), e recalculado a cada render o relógio ficaria preso na hora do servidor.
  const serverTime = mine?.serverTime;
  const offset = useMemo(() => (serverTime ? clockOffset(serverTime) : 0), [serverTime]);
  const now = useServerNow(offset);

  // `lot:ended` também chega na sala pessoal do leiloeiro dono: relê para mostrar resultado e total.
  useSocketEvent(SocketEvent.LOT_ENDED, reloadMine);
  // Lance novo (e o fim prorrogado que ele traz) chega na sala pessoal: relê para atualizar lance atual e contagem.
  useSocketEvent(SocketEvent.BID_NEW, reloadMine);

  const lots = mine?.items ?? [];
  const live = lots.filter((lot) => lot.status === LotStatus.LIVE);
  const visible = lots.filter((lot) => matchesFilter(lot, status, query));
  const count = (value: LotStatus) => (mine ? String(lots.filter((lot) => lot.status === value).length) : null);

  return (
    <div className="grid grid-cols-1 gap-7 pt-7">
      <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-5">
        <PageTitle eyebrow={`Leiloeiro · ${user?.name ?? ''}`} title="Painel do leiloeiro" />
        {/* Celular: total recebido sozinho em cima, ao vivo e encerrados lado a lado embaixo. */}
        <dl className="grid w-full grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:w-auto sm:items-end sm:gap-x-10 *:first:col-span-2">

          <Kpi label="Total recebido" value={mine ? formatMoney(mine.totalReceived, { short: true }) : null} boneClassName="w-32" />
          <Kpi label="Ao vivo agora" value={count(LotStatus.LIVE)} boneClassName="w-8" valueClassName="text-primary" />
          <Kpi label="Encerrados" value={count(LotStatus.ENDED)} boneClassName="w-8" />
        </dl>
      </div>

      <Tabs value={tab} onValueChange={(value) => isPanelTab(value) && setTab(value)} className="min-w-0 gap-6">
        <TabsList aria-label="Painel" className="h-auto! w-full rounded-[8px] bg-muted p-0.75 sm:w-fit *:flex-1 sm:*:flex-none">
          <TabsTrigger value={PanelTab.LOTS} className={TAB_TRIGGER}>
            Meus lotes
            {mine && <span className="ml-1 font-mono text-[11.5px]">{lots.length}</span>}
          </TabsTrigger>
          <TabsTrigger value={PanelTab.NEW} className={TAB_TRIGGER}>
            Criar lote
          </TabsTrigger>
        </TabsList>

        <TabsContent value={PanelTab.LOTS} className="grid grid-cols-1 gap-9">
          {mineError && !mine ? (
            <ErrorWall title="Seus lotes não carregaram" message={mineError} onRetry={reloadMine} />
          ) : !mine ? (
            <MyLotsSkeleton />
          ) : lots.length === 0 ? (
            <EmptyWall title="Você ainda não criou lotes">
              <p className="max-w-[46ch] text-sm text-muted-foreground">
                Busque uma obra do Met, defina o lance inicial e a duração, e o lote aparece aqui.
              </p>
              <Button className="mt-1.5" onClick={() => setTab(PanelTab.NEW)}>
                Criar lote
              </Button>
            </EmptyWall>
          ) : (
            <>
              {live.length > 0 && <LiveNow lots={live} now={now} />}
              <section aria-labelledby="all-lots-heading" className="grid grid-cols-1 gap-3">
                <LotsFilter lots={lots} shown={visible.length} status={status} query={query} onStatus={setStatus} onQuery={setQuery} />
                {visible.length === 0 ? (
                  <p className="rounded-[10px] border bg-card px-5 py-8 text-center text-muted-foreground">Nenhum lote com esse filtro.</p>
                ) : (
                  <MyLotsTable lots={visible} now={now} onChanged={reloadMine} />
                )}
                <p aria-live="polite" className="text-[13px] text-muted-foreground">
                  {visible.length} de {lots.length} {lots.length === 1 ? 'lote' : 'lotes'}, mais recentes primeiro
                </p>
              </section>
            </>
          )}
        </TabsContent>

        {/* Montado sempre: trocar de aba não perde a busca nem o rascunho do lote. */}
        <TabsContent
          value={PanelTab.NEW}
          forceMount
          className="grid items-start gap-6 data-[state=inactive]:hidden lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
        >
          <MetSearch
            selected={selected}
            onSelect={(artwork) => {
              setSelected(artwork);
              // No celular o formulário fica abaixo de todos os resultados: leva a pessoa até ele.
              if (!window.matchMedia(WIDE_LAYOUT).matches) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
          <aside ref={formRef} className="scroll-mt-24">
            {selected ? (
              <NewLotForm
                key={selected.metObjectId}
                artwork={selected}
                serverOffset={offset}
                onCreated={() => {
                  setSelected(null);
                  reloadMine();
                  setTab(PanelTab.LOTS);
                }}
              />
            ) : (
              <div className="grid gap-2 rounded-[10px] border border-dashed bg-muted p-5">
                <span className="text-[11.5px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Novo lote</span>
                <p className="text-sm text-muted-foreground">Escolha uma obra na busca para montar o lote e ver como ele fica na vitrine.</p>
              </div>
            )}
          </aside>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** `value` nulo = ainda carregando: o bloco ocupa a mesma altura do número. */
function Kpi({
  label,
  value,
  boneClassName,
  valueClassName,
}: {
  label: string;
  value: string | null;
  boneClassName: string;
  valueClassName?: string;
}) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('flex h-9 items-center text-[22px] leading-none font-bold tracking-tight whitespace-nowrap tabular-nums sm:text-[28px]', valueClassName)}>
        {value ?? <Bone className={cn('h-7 rounded-md', boneClassName)} />}
      </dd>
    </div>
  );
}

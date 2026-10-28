import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { cn } from 'cn';
import { ShieldCheckIcon } from 'lucide-react';
import { Artwork } from '@/components/artwork';
import { EmptyWall, ErrorWall } from '@/components/empty-wall';
import { PageTitle } from '@/components/page-title';
import { Bone } from '@/components/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LotStatus, MyBidStatus, ROLE_LABELS, ROUTES, Role, SocketEvent, auditPath, lotPath, receiptPath } from '@/constants';
import { assetUrl } from '@/lib/api';
import { usePageData } from '@/lib/loading';
import { formatMoney } from '@/lib/money';
import { socket } from '@/lib/socket';
import { formatShortDate } from '@/lib/time';
import type { MyBidItem } from '@/types';

const Filter = { ALL: 'all', OPEN: 'open', WON: 'won', CLOSED: 'closed' } as const;
type Filter = (typeof Filter)[keyof typeof Filter];

const FILTERS = [
  { value: Filter.ALL, label: 'Todos' },
  { value: Filter.OPEN, label: 'Em disputa' },
  { value: Filter.WON, label: 'Arrematados' },
  { value: Filter.CLOSED, label: 'Encerrados' },
] as const;

const isFilter = (value: string): value is Filter => FILTERS.some((f) => f.value === value);

const STATUS: Record<
  MyBidStatus,
  { label: string; variant: 'win' | 'warn' | 'accent' | 'neutral'; filter: Filter; action: string; primary: boolean }
> = {
  [MyBidStatus.OUTBID]: { label: 'Superado', variant: 'warn', filter: Filter.OPEN, action: 'Cobrir lance', primary: true },
  [MyBidStatus.WINNING]: { label: 'Ganhando', variant: 'win', filter: Filter.OPEN, action: 'Abrir sala', primary: false },
  [MyBidStatus.WON]: { label: 'Arrematado', variant: 'accent', filter: Filter.WON, action: 'Ver comprovante', primary: true },
  [MyBidStatus.LOST]: { label: 'Não arrematado', variant: 'neutral', filter: Filter.CLOSED, action: 'Ver resultado', primary: false },
  [MyBidStatus.CANCELLED]: { label: 'Cancelado', variant: 'neutral', filter: Filter.CLOSED, action: 'Ver lote', primary: false },
};

/** Quem pede ação primeiro; o sort estável mantém a ordem da API dentro de cada situação. */
const URGENCY: MyBidStatus[] = [MyBidStatus.OUTBID, MyBidStatus.WINNING, MyBidStatus.WON, MyBidStatus.LOST, MyBidStatus.CANCELLED];

const ROW_GRID =
  'grid grid-cols-[56px_minmax(0,1fr)] items-center gap-x-4 gap-y-2.5 px-5 lg:grid-cols-[56px_minmax(0,1fr)_112px_112px_136px_112px_180px]';

const SKELETON_ROWS = 3;

function ListHeader() {
  return (
    <div
      aria-hidden
      className={cn(
        ROW_GRID,
        'hidden border-b bg-muted/50 py-2.5 text-[11.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase lg:grid',
      )}
    >
      <span className="col-span-2">Obra</span>
      <span className="text-right">Seu lance</span>
      <span className="text-right">Atual / final</span>
      <span>Situação</span>
      <span>Prazo</span>
      <span />
    </div>
  );
}

/** Mesmo grid das linhas reais: quando os lances chegam, nada muda de lugar. */
function BidListSkeleton() {
  return (
    <div role="status" aria-label="Carregando seus lances" className="grid gap-5">
      <Bone row={0} className="h-9.5 w-full rounded-[8px] sm:w-105" />
      <div className="overflow-hidden rounded-[10px] border bg-card">
        <ListHeader />
        <ul>
          {Array.from({ length: SKELETON_ROWS }, (_, row) => (
            <li key={row} className={cn(ROW_GRID, 'border-t py-3.5 first:border-t-0')}>
              <Bone row={row} className="aspect-4/5 w-14 rounded-md bg-wall" />
              <div className="grid gap-2">
                <Bone row={row} className="h-3.5 w-3/5" />
                <Bone row={row} className="h-3 w-2/5" />
              </div>
              <div className="col-start-2 flex gap-3 lg:hidden">
                <Bone row={row} className="h-3 w-24" />
                <Bone row={row} className="h-5 w-20 rounded-full" />
              </div>
              <Bone row={row} className="hidden h-3.5 w-20 justify-self-end lg:block" />
              <Bone row={row} className="hidden h-3.5 w-20 justify-self-end lg:block" />
              <Bone row={row} className="hidden h-6 w-24 rounded-full lg:block" />
              <div className="hidden gap-1.5 lg:grid">
                <Bone row={row} className="h-3 w-16" />
                <Bone row={row} className="h-3 w-12" />
              </div>
              <Bone row={row} className="hidden h-8 w-full rounded-md lg:block" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function deadline(item: MyBidItem): { label: string; date: string | null } {
  if (item.myStatus === MyBidStatus.CANCELLED) return { label: 'Cancelado', date: null };
  const open = item.lot.status === LotStatus.LIVE || item.lot.status === LotStatus.SCHEDULED;
  return { label: open ? 'Termina' : 'Encerrado', date: formatShortDate(item.lot.endsAt) };
}

function BidRow({ item }: { item: MyBidItem }) {
  const status = STATUS[item.myStatus];
  const outbid = item.myStatus === MyBidStatus.OUTBID;
  const actionPath = item.myStatus === MyBidStatus.WON && item.receiptCode ? receiptPath(item.receiptCode) : lotPath(item.lot.id);
  const { label: deadlineLabel, date } = deadline(item);

  return (
    <li className={cn(ROW_GRID, 'border-t py-3.5 first:border-t-0', outbid && 'bg-warn-soft/45')}>
      <Artwork src={assetUrl(item.lot.imageUrl)} alt="" thin />
      <div className="grid min-w-0 gap-px">
        <Link to={lotPath(item.lot.id)} className="truncate leading-tight font-semibold underline-offset-4 hover:text-primary hover:underline">
          {item.lot.title}
        </Link>
        {item.lot.artist && <span className="truncate text-[13px] text-muted-foreground">{item.lot.artist}</span>}
      </div>

      {/* `lg:contents` devolve as células à grade; abaixo de `lg`, cada par vira uma linha com rótulo. */}
      <div className="col-start-2 flex flex-wrap gap-x-5 lg:contents">
        <div className="lg:text-right">
          <span className="mr-1.5 text-xs text-muted-foreground lg:sr-only">Seu lance</span>
          <span className="font-mono text-sm tabular-nums">{formatMoney(item.myHighestBid)}</span>
        </div>
        <div className="lg:text-right">
          <span className="mr-1.5 text-xs text-muted-foreground lg:sr-only">Atual</span>
          <span className={cn('font-mono text-sm tabular-nums', outbid ? 'font-semibold text-warn' : 'text-muted-foreground')}>
            {formatMoney(item.lot.currentBid ?? item.myHighestBid)}
          </span>
        </div>
      </div>

      <div className="col-start-2 flex flex-wrap items-center gap-x-3 gap-y-1 lg:contents">
        <div>
          <Badge variant={status.variant} className="h-6 gap-1.5">
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            {status.label}
          </Badge>
        </div>
        <div className="flex gap-1 text-[13px] lg:grid lg:gap-0">
          <span className="font-semibold">{deadlineLabel}</span>
          {date && <span className="text-muted-foreground">{date}</span>}
        </div>
      </div>

      <div className="col-start-2 flex gap-2 lg:col-start-auto lg:justify-end">
        <Button asChild size="sm" variant={status.primary ? 'default' : 'outline'} className="w-35">
          <Link to={actionPath}>{status.action}</Link>
        </Button>
        <Button asChild size="icon" variant="outline" className="text-muted-foreground hover:text-primary">
          <Link to={auditPath(item.lot.id)} aria-label="Auditoria do lote" title="Auditoria do lote">
            <ShieldCheckIcon />
          </Link>
        </Button>
      </div>
    </li>
  );
}

export function MyBidsPage() {
  const { data, error, reload } = usePageData<{ items: MyBidItem[] }>('/api/me/bids');
  const items = useMemo(
    () => data && [...data.items].sort((a, b) => URGENCY.indexOf(a.myStatus) - URGENCY.indexOf(b.myStatus)),
    [data],
  );
  const [filter, setFilter] = useState<Filter>(Filter.ALL);

  // Ser superado, dar lance ou liquidar (estes dois via `wallet:update`) muda a lista: relê.
  useEffect(() => {
    socket.on(SocketEvent.BID_OUTBID, reload);
    socket.on(SocketEvent.WALLET_UPDATE, reload);
    return () => {
      socket.off(SocketEvent.BID_OUTBID, reload);
      socket.off(SocketEvent.WALLET_UPDATE, reload);
    };
  }, [reload]);

  const inFilter = (item: MyBidItem, value: Filter) => value === Filter.ALL || STATUS[item.myStatus].filter === value;

  return (
    <div className="grid grid-cols-1 gap-7 pt-7">
      <PageTitle eyebrow={ROLE_LABELS[Role.BIDDER]} title="Meus arremates" />

      {error && !items ? (
        <ErrorWall title="Seus arremates não carregaram" message={error} onRetry={reload} />
      ) : !items ? (
        <BidListSkeleton />
      ) : items.length === 0 ? (
        <EmptyWall title="Você ainda não deu nenhum lance">
          <p className="max-w-[46ch] text-sm text-muted-foreground">
            Escolha uma obra na vitrine e dê o primeiro lance. Os lotes em que você participar aparecem aqui, com o comprovante
            dos que arrematar.
          </p>
          <Button asChild className="mt-1.5">
            <Link to={ROUTES.SHOWCASE}>Ver obras em leilão</Link>
          </Button>
        </EmptyWall>
      ) : (
        <Tabs value={filter} onValueChange={(value) => isFilter(value) && setFilter(value)} className="gap-5">
          <TabsList aria-label="Situação dos lotes" className="h-auto! w-full rounded-[8px] bg-muted p-0.75 sm:w-fit">
            {FILTERS.map((f) => (
              <TabsTrigger
                key={f.value}
                value={f.value}
                className="h-auto px-1.5 py-1.5 text-[13px] text-muted-foreground data-active:bg-card data-active:font-semibold data-active:text-foreground sm:px-3 sm:text-[13.5px] dark:data-active:border-transparent dark:data-active:bg-card"
              >
                {f.label}
                <span className="ml-1 font-mono text-[11.5px]">{items.filter((item) => inFilter(item, f.value)).length}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {FILTERS.map((f) => {
            const visible = items.filter((item) => inFilter(item, f.value));
            return (
              <TabsContent key={f.value} value={f.value} className="overflow-hidden rounded-[10px] border bg-card text-[15px]">
                <ListHeader />
                {visible.length === 0 ? (
                  <p className="px-5 py-8 text-center text-muted-foreground">Nenhum lote nessa situação.</p>
                ) : (
                  <ul aria-live="polite">
                    {visible.map((item) => (
                      <BidRow key={item.lot.id} item={item} />
                    ))}
                  </ul>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}

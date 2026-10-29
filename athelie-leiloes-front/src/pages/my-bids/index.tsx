import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { EmptyWall } from '@/components/empty-wall';
import { ErrorWall } from '@/components/error-wall';
import { PageTitle } from '@/components/page-title';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ROLE_LABELS, ROUTES, Role, SocketEvent } from '@/constants';
import { usePageData } from '@/hooks/use-page-data';
import { useServerNow } from '@/hooks/use-server-now';
import { useSocketEvent } from '@/hooks/use-socket-event';
import type { MyBidItem } from '@/types';
import { BidCard } from './bid-card';
import { FILTERS, Filter, STATUS, URGENCY, isFilter } from './bid-labels';
import { GRID } from './bid-layout';
import { BidListSkeleton } from './bid-list-skeleton';

export function MyBidsPage() {
  const { data, error, reload } = usePageData<{ items: MyBidItem[] }>('/api/me/bids');
  const items = useMemo(
    () => data && [...data.items].sort((a, b) => URGENCY.indexOf(a.myStatus) - URGENCY.indexOf(b.myStatus)),
    [data],
  );
  const [filter, setFilter] = useState<Filter>(Filter.ALL);
  const now = useServerNow(0);

  // Ser superado, dar lance ou liquidar (estes dois via `wallet:update`) muda a lista: relê.
  useSocketEvent(SocketEvent.BID_OUTBID, reload);
  useSocketEvent(SocketEvent.WALLET_UPDATE, reload);

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
        <Tabs value={filter} onValueChange={(value) => isFilter(value) && setFilter(value)} className="min-w-0 gap-5">
          <TabsList
            aria-label="Situação dos lotes"
            className="h-auto! w-full justify-start overflow-x-auto rounded-[8px] bg-muted p-0.75 scrollbar-none sm:w-fit sm:max-w-full [&::-webkit-scrollbar]:hidden"
          >
            {FILTERS.map((f) => (
              <TabsTrigger
                key={f.value}
                value={f.value}
                className="h-auto flex-none px-3 py-1.5 text-[13px] text-muted-foreground data-active:bg-card data-active:font-semibold data-active:text-foreground sm:text-[13.5px] dark:data-active:border-transparent dark:data-active:bg-card"
              >
                {f.label}
                <span className="ml-1 font-mono text-[11.5px]">{items.filter((item) => inFilter(item, f.value)).length}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {FILTERS.map((f) => {
            const visible = items.filter((item) => inFilter(item, f.value));
            return (
              <TabsContent key={f.value} value={f.value}>
                {visible.length === 0 ? (
                  <p className="rounded-[10px] border bg-card px-5 py-8 text-center text-muted-foreground">Nenhum lote nessa situação.</p>
                ) : (
                  <ul aria-live="polite" className={GRID}>
                    {visible.map((item) => (
                      <BidCard key={item.lot.id} item={item} now={now} />
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

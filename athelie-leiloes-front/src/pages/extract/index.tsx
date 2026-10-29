import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeftIcon } from 'lucide-react';
import { EmptyWall } from '@/components/empty-wall';
import { ErrorWall } from '@/components/error-wall';
import { PageTitle } from '@/components/page-title';
import { Button } from '@/components/ui/button';
import { EntryPeriod, type EntryFilter, ROLE_LABELS, ROUTES, Role } from '@/constants';
import { loadWallet, useWallet } from '@/lib/wallet';
import { EntriesList } from './entries-list';
import { EntriesSkeleton } from './entries-skeleton';
import { DEFAULT_FILTER, DEFAULT_PERIOD } from './entry-view';
import { ExtractFilters } from './extract-filters';
import { ExtractSummary } from './extract-summary';
import { useEntries } from './use-entries';

export function ExtractPage() {
  const { wallet } = useWallet();
  const [filter, setFilter] = useState<EntryFilter>(DEFAULT_FILTER);
  const [period, setPeriod] = useState<EntryPeriod>(DEFAULT_PERIOD);
  const { items, total, error, loadingMore, loadMore, reload } = useEntries(filter, period);

  useEffect(() => {
    void loadWallet();
  }, []);

  const shown = items?.length ?? 0;
  const remaining = (total ?? 0) - shown;

  return (
    <div className="grid grid-cols-1 gap-6 pt-7">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <PageTitle eyebrow={ROLE_LABELS[Role.BIDDER]} title="Extrato" />
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link to={ROUTES.WALLET}>
            <ArrowLeftIcon aria-hidden="true" />
            Voltar à carteira
          </Link>
        </Button>
      </div>

      <ExtractSummary wallet={wallet} />
      <ExtractFilters filter={filter} period={period} total={total ?? null} onFilter={setFilter} onPeriod={setPeriod} />

      {!items ? (
        error ? (
          <ErrorWall title="O extrato não carregou" message={error} onRetry={reload} />
        ) : (
          <EntriesSkeleton />
        )
      ) : items.length === 0 ? (
        <EmptyWall title="Nenhum movimento por aqui">
          <p className="max-w-[46ch] text-sm text-muted-foreground">
            Nada com esse filtro. Depósitos, lances e arremates aparecem aqui assim que acontecem.
          </p>
          {period === EntryPeriod.WEEK && (
            <Button variant="outline" className="mt-1.5" onClick={() => setPeriod(EntryPeriod.ALL)}>
              Ver todo o período
            </Button>
          )}
        </EmptyWall>
      ) : (
        <div className="grid gap-3">
          <EntriesList entries={items} />
          {remaining > 0 && (
            <Button type="button" variant="outline" disabled={loadingMore} onClick={() => void loadMore()} className="h-10 border-dashed bg-card text-primary">
              {loadingMore ? 'Carregando…' : `Mostrar mais ${remaining} ${remaining === 1 ? 'movimento' : 'movimentos'}`}
            </Button>
          )}
          <p aria-live="polite" className="text-[13px] text-muted-foreground">
            {shown} de {total} {total === 1 ? 'movimento' : 'movimentos'}, mais recentes primeiro
          </p>
        </div>
      )}
    </div>
  );
}

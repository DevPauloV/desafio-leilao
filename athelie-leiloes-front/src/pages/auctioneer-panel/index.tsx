import { useState } from 'react';
import { cn } from 'cn';
import { EmptyWall, ErrorWall } from '@/components/empty-wall';
import { PageTitle } from '@/components/page-title';
import { Bone } from '@/components/skeleton';
import { LotStatus, SocketEvent } from '@/constants';
import { useAuth } from '@/lib/auth';
import { usePageData } from '@/hooks/use-page-data';
import { useSocketEvent } from '@/hooks/use-socket-event';
import { formatMoney } from '@/lib/money';
import type { MetArtwork, MyLotsResponse } from '@/types';
import { MetSearch } from './met-search';
import { MyLotsSkeleton, MyLotsTable } from './my-lots-table';
import { NewLotForm } from './new-lot-form';

const sectionHeading = 'text-[13px] font-semibold tracking-[0.1em] text-muted-foreground uppercase';

export function AuctioneerPanelPage() {
  const { user } = useAuth();
  const { data: mine, error: mineError, reload: reloadMine } = usePageData<MyLotsResponse>('/api/me/lots');
  const [selected, setSelected] = useState<MetArtwork | null>(null);

  // `lot:ended` também chega na sala pessoal do leiloeiro dono: relê para mostrar resultado e total.
  useSocketEvent(SocketEvent.LOT_ENDED, reloadMine);

  const count = (status: LotStatus) => (mine ? String(mine.items.filter((lot) => lot.status === status).length) : null);

  return (
    <div className="grid grid-cols-1 gap-7 pt-7">
      <PageTitle eyebrow={`Leiloeiro · ${user?.name ?? ''}`} title="Painel do leiloeiro" />

      <dl className="flex flex-wrap items-end gap-x-12 gap-y-3">
        <Kpi label="Total recebido" value={mine ? formatMoney(mine.totalReceived, { short: true }) : null} boneClassName="w-36" />
        <Kpi label="Lotes ao vivo" value={count(LotStatus.LIVE)} boneClassName="w-8" />
        <Kpi label="Encerrados" value={count(LotStatus.ENDED)} boneClassName="w-8" />
      </dl>

      <section aria-label="Criar lote" className="grid overflow-hidden rounded-[10px] border bg-card lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <MetSearch selected={selected} onSelect={setSelected} />
        <NewLotForm
          key={selected?.metObjectId ?? 'none'}
          artwork={selected}
          onCreated={() => {
            setSelected(null);
            reloadMine();
          }}
        />
      </section>

      <section aria-labelledby="my-lots-heading" className="grid grid-cols-1 gap-2">
        <h2 id="my-lots-heading" className={sectionHeading}>
          Meus lotes
        </h2>
        {mineError ? (
          <ErrorWall
            title="Seus lotes não carregaram"
            message={mineError}
            onRetry={reloadMine}
          />
        ) : !mine ? (
          <MyLotsSkeleton />
        ) : mine.items.length === 0 ? (
          <EmptyWall title="Você ainda não criou lotes">
            <p className="max-w-[46ch] text-sm text-muted-foreground">
              Busque uma obra do Met logo acima, defina o lance inicial e as datas, e o lote aparece aqui.
            </p>
          </EmptyWall>
        ) : (
          <MyLotsTable lots={mine.items} onChanged={reloadMine} />
        )}
      </section>
    </div>
  );
}

/** `value` nulo = ainda carregando: o bloco ocupa a mesma altura do número. */
function Kpi({ label, value, boneClassName }: { label: string; value: string | null; boneClassName: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex h-9 items-center text-4xl leading-none font-bold tracking-tight tabular-nums">
        {value ?? <Bone className={cn('h-7.5 rounded-md', boneClassName)} />}
      </dd>
    </div>
  );
}

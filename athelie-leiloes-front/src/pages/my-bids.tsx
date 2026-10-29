import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { cn } from 'cn';
import { ReceiptTextIcon, Share2Icon, ShieldCheckIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Artwork } from '@/components/artwork';
import { EmptyWall, ErrorWall } from '@/components/empty-wall';
import { PageTitle } from '@/components/page-title';
import { Bone } from '@/components/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LotStatus, MyBidStatus, ROLE_LABELS, ROUTES, Role, SocketEvent, auditPath, lotPath, receiptPath } from '@/constants';
import { assetUrl } from '@/lib/api';
import { copyText } from '@/lib/clipboard';
import { formatMoney } from '@/lib/money';
import { usePageData } from '@/hooks/use-page-data';
import { useServerNow } from '@/hooks/use-server-now';
import { useSocketEvent } from '@/hooks/use-socket-event';
import { formatCountdown, formatShortDate } from '@/lib/time';
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
  [MyBidStatus.WON]: { label: 'Arrematado', variant: 'accent', filter: Filter.WON, action: 'Comprovante', primary: true },
  [MyBidStatus.LOST]: { label: 'Não arrematado', variant: 'neutral', filter: Filter.CLOSED, action: 'Ver resultado', primary: false },
  [MyBidStatus.CANCELLED]: { label: 'Cancelado', variant: 'neutral', filter: Filter.CLOSED, action: 'Ver lote', primary: false },
};

/** Quem pede ação primeiro; o sort estável mantém a ordem da API dentro de cada situação. */
const URGENCY: MyBidStatus[] = [MyBidStatus.OUTBID, MyBidStatus.WINNING, MyBidStatus.WON, MyBidStatus.LOST, MyBidStatus.CANCELLED];

const SKELETON_CARDS = 4;

/** A ficha escolhe o próprio layout pela largura que recebe (`@container`), não pela da tela. */
const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,480px),1fr))] gap-4';
const CARD_COLUMNS = 'grid grid-cols-[168px_minmax(0,1fr)] @max-[440px]:grid-cols-1';

/** Mesma ficha das linhas reais: quando os lances chegam, nada muda de lugar. */
function BidListSkeleton() {
  return (
    <div role="status" aria-label="Carregando seus lances" className="grid gap-5">
      <Bone row={0} className="h-9.5 w-full rounded-[8px] sm:w-105" />
      <div className={GRID}>
        {Array.from({ length: SKELETON_CARDS }, (_, row) => (
          <div key={row} className="@container overflow-hidden rounded-[10px] border bg-card">
            <div className={CARD_COLUMNS}>
              <Bone row={row} className="h-44 rounded-none bg-wall @max-[440px]:h-37.5" />
              <div className="grid content-start gap-3 p-4">
                <Bone row={row} className="h-6 w-24 rounded-full" />
                <Bone row={row} className="h-4 w-4/5" />
                <Bone row={row} className="h-3 w-2/5" />
                <Bone row={row} className="h-16 w-full" />
                <Bone row={row} className="h-9 w-full rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Rótulo e valor do prazo: contagem enquanto o lote está ao vivo, data nos demais. */
function deadline(item: MyBidItem, now: number): { label: string; value: string; clock: boolean } {
  const { lot, myStatus } = item;
  if (myStatus === MyBidStatus.CANCELLED) return { label: 'Lote', value: 'Cancelado pelo leiloeiro', clock: false };
  if (lot.status === LotStatus.LIVE) return { label: 'Termina em', value: formatCountdown(new Date(lot.endsAt).getTime() - now), clock: true };
  if (lot.status === LotStatus.SCHEDULED) return { label: 'Termina em', value: formatShortDate(lot.endsAt), clock: false };
  return { label: myStatus === MyBidStatus.WON ? 'Arrematado em' : 'Encerrado em', value: formatShortDate(lot.endsAt), clock: false };
}

function currentLabel(item: MyBidItem): string {
  if (item.myStatus === MyBidStatus.CANCELLED) return 'Último lance';
  return item.lot.status === LotStatus.LIVE ? 'Lance atual' : 'Valor final';
}

async function copyReceiptLink(code: string) {
  const link = `${window.location.origin}${receiptPath(code)}`;
  if (await copyText(link)) toast.success('Link do comprovante copiado');
  else toast.error('Não foi possível copiar. Abra o comprovante e copie o endereço da barra do navegador.');
}

function BidCard({ item, now }: { item: MyBidItem; now: number }) {
  const status = STATUS[item.myStatus];
  const outbid = item.myStatus === MyBidStatus.OUTBID;
  const receiptCode = item.myStatus === MyBidStatus.WON ? item.receiptCode : undefined;
  const actionPath = receiptCode ? receiptPath(receiptCode) : lotPath(item.lot.id);
  const { label: whenLabel, value: whenValue, clock } = deadline(item, now);

  return (
    <li className="@container">
      <article className={cn('h-full overflow-hidden rounded-[10px] border bg-card', outbid && 'border-warn/55')}>
        <div className={cn(CARD_COLUMNS, 'h-full')}>
          <Artwork
            src={assetUrl(item.lot.imageUrl)}
            alt=""
            thin
            className="aspect-auto self-stretch rounded-none @max-[440px]:h-37.5"
          />
          <div className="grid min-w-0 content-start gap-3 p-4 @max-[440px]:gap-2.5 @max-[440px]:p-3.5">
            <div>
              <Badge variant={status.variant} className="h-6 gap-1.5">
                <span aria-hidden className="size-1.5 rounded-full bg-current" />
                {status.label}
              </Badge>
            </div>
            <div className="grid min-w-0 gap-px">
              <Link
                to={lotPath(item.lot.id)}
                className="line-clamp-2 leading-snug font-bold underline-offset-4 hover:text-primary hover:underline"
              >
                {item.lot.title}
              </Link>
              {item.lot.artist && <span className="truncate text-[13px] text-muted-foreground">{item.lot.artist}</span>}
            </div>

            <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 border-y border-dashed py-2.5">
              <div className="grid gap-px">
                <dt className="text-[11.5px] text-muted-foreground">Seu lance</dt>
                <dd className="font-mono text-sm tabular-nums">{formatMoney(item.myHighestBid)}</dd>
              </div>
              <div className="grid gap-px">
                <dt className="text-[11.5px] text-muted-foreground">{currentLabel(item)}</dt>
                <dd className={cn('font-mono text-sm tabular-nums', outbid && 'font-semibold text-warn')}>
                  {formatMoney(item.lot.currentBid ?? item.myHighestBid)}
                </dd>
              </div>
              <div className="col-span-2 flex flex-wrap items-baseline gap-x-1.5">
                <dt className="text-[13px] text-muted-foreground">{whenLabel}</dt>
                <dd className={cn('text-[13px] font-semibold', clock && 'font-mono font-medium tabular-nums')}>{whenValue}</dd>
              </div>
            </dl>

            <div className="flex justify-end gap-2">
              <Button
                asChild
                variant={status.primary ? 'default' : 'outline'}
                className="min-w-39 @max-[440px]:min-w-0 @max-[440px]:flex-1"
              >
                <Link to={actionPath}>
                  {receiptCode && <ReceiptTextIcon />}
                  {status.action}
                </Link>
              </Button>
              {receiptCode && (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="text-muted-foreground hover:text-primary"
                  aria-label="Copiar link do comprovante"
                  title="Copiar link do comprovante"
                  onClick={() => void copyReceiptLink(receiptCode)}
                >
                  <Share2Icon />
                </Button>
              )}
              <Button asChild size="icon" variant="outline" className="text-muted-foreground hover:text-primary">
                <Link to={auditPath(item.lot.id)} aria-label="Auditoria do lote" title="Auditoria do lote">
                  <ShieldCheckIcon />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </article>
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

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Artwork } from '@/components/artwork';
import { EmptyWall } from '@/components/empty-wall';
import { ErrorAlert } from '@/components/form';
import { PageTitle } from '@/components/page-title';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LotStatus, MyBidStatus, ROLE_LABELS, ROUTES, Role, SocketEvent, auditPath, lotPath, receiptPath } from '@/constants';
import { api, assetUrl, errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { socket } from '@/lib/socket';
import { formatShortDate } from '@/lib/time';
import type { MyBidItem } from '@/types';

/** Rótulo e cor de cada situação, nas cores de status do protótipo. */
const STATUS: Record<MyBidStatus, { label: string; variant: 'win' | 'warn' | 'accent' | 'neutral' }> = {
  [MyBidStatus.WINNING]: { label: 'Ganhando', variant: 'win' },
  [MyBidStatus.OUTBID]: { label: 'Superado', variant: 'warn' },
  [MyBidStatus.WON]: { label: 'Arrematado', variant: 'accent' },
  [MyBidStatus.LOST]: { label: 'Não arrematado', variant: 'neutral' },
  [MyBidStatus.CANCELLED]: { label: 'Cancelado', variant: 'neutral' },
};

/** "termina 25 out, 14:00" / "encerrado 24 out, 21:14" / "cancelado". */
function endText(item: MyBidItem): string {
  if (item.myStatus === MyBidStatus.CANCELLED) return 'cancelado';
  if (item.lot.status === LotStatus.LIVE || item.lot.status === LotStatus.SCHEDULED) return `termina ${formatShortDate(item.lot.endsAt)}`;
  return `encerrado ${formatShortDate(item.lot.endsAt)}`;
}

export function MyBidsPage() {
  const [reload, setReload] = useState(0);
  const [items, setItems] = useState<MyBidItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api<{ items: MyBidItem[] }>('/api/me/bids', { signal: controller.signal }).then(
      (data) => {
        setItems(data.items);
        setError(null);
      },
      (err: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(err));
      },
    );
    return () => controller.abort();
  }, [reload]);

  // Superado em algum lote, lance próprio ou liquidação (que gera `wallet:update`): a lista muda, então relê.
  useEffect(() => {
    const refresh = () => setReload((n) => n + 1);
    socket.on(SocketEvent.BID_OUTBID, refresh);
    socket.on(SocketEvent.WALLET_UPDATE, refresh);
    return () => {
      socket.off(SocketEvent.BID_OUTBID, refresh);
      socket.off(SocketEvent.WALLET_UPDATE, refresh);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-7 pt-7">
      <PageTitle eyebrow={ROLE_LABELS[Role.BIDDER]} title="Meus arremates" />

      {error && !items ? (
        <div className="grid justify-items-start gap-3">
          <ErrorAlert>{error}</ErrorAlert>
          <Button type="button" variant="outline" onClick={() => setReload((n) => n + 1)}>
            Tentar de novo
          </Button>
        </div>
      ) : !items ? (
        <p role="status" className="rounded-[10px] border bg-card p-6 text-muted-foreground">
          Carregando seus lances…
        </p>
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
        <ul className="grid rounded-[10px] border bg-card" aria-live="polite">
          {items.map((item) => {
            const status = STATUS[item.myStatus];
            const open = item.myStatus === MyBidStatus.WINNING || item.myStatus === MyBidStatus.OUTBID;
            return (
              <li
                key={item.lot.id}
                className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-x-5 gap-y-3 border-t px-5 py-4 first:border-t-0 sm:grid-cols-[64px_minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto]"
              >
                <Artwork src={assetUrl(item.lot.imageUrl)} alt="" thin />
                <div className="grid gap-px">
                  <Link to={lotPath(item.lot.id)} className="text-base leading-tight font-semibold underline-offset-4 hover:text-primary hover:underline">
                    {item.lot.title}
                  </Link>
                  <span className="text-[13px] text-muted-foreground">
                    {[item.lot.artist, endText(item)].filter(Boolean).join(' · ')}
                  </span>
                </div>
                <div className="col-start-2 sm:col-start-auto">
                  <div className="text-xs text-muted-foreground">{item.myStatus === MyBidStatus.WON ? 'Arrematado por' : 'Seu maior lance'}</div>
                  <div className="font-mono text-sm tabular-nums">{formatMoney(item.myHighestBid)}</div>
                </div>
                <div className="col-start-2 sm:col-start-auto">
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <div className="col-start-2 flex flex-wrap gap-2 sm:col-start-auto sm:justify-end">
                  {item.myStatus === MyBidStatus.WON && item.receiptCode && (
                    <Button asChild size="sm">
                      <Link to={receiptPath(item.receiptCode)}>Ver comprovante</Link>
                    </Button>
                  )}
                  <Button asChild size="sm" variant={open ? 'default' : 'outline'}>
                    <Link to={lotPath(item.lot.id)}>Abrir sala</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to={auditPath(item.lot.id)}>Auditoria</Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

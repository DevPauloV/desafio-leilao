import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { Artwork } from '@/components/artwork';
import { ErrorWall } from '@/components/error-wall';
import { MuseumLabel } from '@/components/museum-label';
import { Paddle } from '@/components/paddle';
import { Button } from '@/components/ui/button';
import { ErrorCode, ROUTES, auditPath, receiptPath } from '@/constants';
import { useCrumbLot } from '@/hooks/use-crumb-lot';
import { ApiError, api, assetUrl, errorMessage } from '@/lib/api';
import { copyText } from '@/lib/clipboard';
import { formatMoney } from '@/lib/money';
import { formatLongDate } from '@/lib/time';
import type { ReceiptView } from '@/types';
import { eyebrow } from './eyebrow';
import { ReceiptSkeleton } from './receipt-skeleton';

export function ReceiptPage() {
  const { code = '' } = useParams();
  const [reload, setReload] = useState(0);
  const requestKey = `${code}:${reload}`;
  const [response, setResponse] = useState<{ key: string; receipt?: ReceiptView; error?: string; notFound?: boolean } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api<ReceiptView>(`/api/receipts/${encodeURIComponent(code)}`, { signal: controller.signal }).then(
      (receipt) => setResponse({ key: requestKey, receipt }),
      (err: unknown) => {
        if (controller.signal.aborted) return;
        const notFound = err instanceof ApiError && err.code === ErrorCode.NOT_FOUND;
        setResponse({ key: requestKey, error: errorMessage(err), notFound });
      },
    );
    return () => controller.abort();
  }, [code, requestKey]);

  const current = response?.key === requestKey ? response : null;
  useCrumbLot(current?.receipt?.lot.id, current?.receipt?.lot.title);
  if (!current) return <ReceiptSkeleton />;
  if (current.error && !current.notFound) {
    return (
      <div className="pt-7">
        <ErrorWall title="O comprovante não carregou" message={current.error} onRetry={() => setReload((n) => n + 1)} />
      </div>
    );
  }
  if (!current.receipt) {
    return (
      <div className="grid justify-items-start gap-3 pt-7">
        <h1 className="text-3xl font-bold tracking-tight">Comprovante não encontrado</h1>
        <p className="text-muted-foreground">
          Confira se o link está completo.{' '}
          <Link to={ROUTES.SHOWCASE} className="text-primary underline-offset-4 hover:underline">
            Ir para a vitrine
          </Link>
        </p>
      </div>
    );
  }

  const { receipt } = current;
  const lot = receipt.lot;
  const link = `${window.location.origin}${receiptPath(receipt.code)}`;

  async function handleCopy() {
    if (await copyText(link)) toast.success('Link copiado');
    else toast.error('Não foi possível copiar. Copie o endereço da barra do navegador.');
  }

  return (
    <div className="pt-7">
      <article className="grid max-w-230 items-start gap-6 rounded-[10px] border bg-card p-4 sm:p-5.5 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:gap-9 md:p-8">
        <Artwork src={assetUrl(lot.imageUrl)} alt={lot.title} />
        <div className="grid min-w-0 gap-5.5">
          <div className="border-b pb-3">
            <h1 className={`${eyebrow} text-primary`}>Comprovante de arremate</h1>
          </div>
          <MuseumLabel
            artist={lot.artist}
            title={lot.title}
            meta={[lot.date, lot.medium, lot.department].filter(Boolean).join(' · ')}
            titleClassName="text-[clamp(24px,7vw,30px)]"
          />
          <div>
            <div className={`${eyebrow} text-muted-foreground`}>Arrematado por</div>
            <div className="text-[clamp(32px,10vw,46px)] leading-none font-bold tracking-tight tabular-nums">{formatMoney(receipt.amount)}</div>
          </div>
          <dl className="m-0 grid grid-cols-1 gap-x-5 gap-y-0.5 text-sm sm:grid-cols-[max-content_minmax(0,1fr)] sm:gap-y-2.5 [&>dd:not(:last-child)]:mb-2.5 sm:[&>dd:not(:last-child)]:mb-0">
            <dt className="text-muted-foreground">Vencedor</dt>
            <dd className="m-0 min-w-0">
              <Paddle pseudonym={receipt.winnerPseudonym} accent />
            </dd>
            <dt className="text-muted-foreground">Encerrado em</dt>
            <dd className="m-0">{formatLongDate(receipt.settledAt)}</dd>
            <dt className="text-muted-foreground">Código</dt>
            <dd className="m-0 font-mono text-[12.5px] break-all">{receipt.code}</dd>
            <dt className="text-muted-foreground">Hash final</dt>
            <dd className="m-0 font-mono text-xs break-all text-muted-foreground">{receipt.chainHash}</dd>
          </dl>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <Button type="button" className="w-full sm:w-auto" onClick={() => void handleCopy()}>
              Copiar link do comprovante
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to={auditPath(lot.id)}>Ver auditoria do lote</Link>
            </Button>
          </div>
        </div>
      </article>
    </div>
  );
}

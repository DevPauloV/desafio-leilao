import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { Artwork, MuseumLabel } from '@/components/artwork';
import { Paddle } from '@/components/paddle';
import { Bone } from '@/components/skeleton';
import { ErrorWall } from '@/components/empty-wall';
import { Button } from '@/components/ui/button';
import { ErrorCode, ROUTES, auditPath, receiptPath } from '@/constants';
import { ApiError, api, assetUrl, errorMessage } from '@/lib/api';
import { copyText } from '@/lib/clipboard';
import { formatMoney } from '@/lib/money';
import { formatLongDate } from '@/lib/time';
import type { ReceiptView } from '@/types';

const eyebrow = 'text-[11.5px] font-semibold tracking-[0.14em] uppercase';

const RECEIPT_FIELDS = [
  { label: 'Vencedor', bone: 'w-28' },
  { label: 'Encerrado em', bone: 'w-52' },
  { label: 'Código', bone: 'w-32' },
  { label: 'Hash final', bone: 'w-11/12' },
];

/** Mesmo cartão do comprovante, com os rótulos fixos e blocos no lugar dos dados. */
function ReceiptSkeleton() {
  return (
    <div role="status" aria-label="Carregando o comprovante" className="pt-7">
      <div className="grid max-w-230 items-start gap-6 rounded-[10px] border bg-card p-4 sm:p-5.5 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:gap-9 md:p-8">
        <Bone className="aspect-4/5 rounded-[10px] bg-wall" />
        <div className="grid min-w-0 gap-5.5">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b pb-3">
            <span className={`${eyebrow} text-primary`}>Comprovante de arremate</span>
            <Bone className="h-3 w-28" />
          </div>
          <div className="grid gap-px">
            <div className="flex h-5 items-center">
              <Bone className="h-3.5 w-40" />
            </div>
            <div className="flex h-9.5 items-center">
              <Bone className="h-7 w-3/4 rounded-md" />
            </div>
            <div className="flex h-5 items-center">
              <Bone className="h-3 w-56" />
            </div>
          </div>
          <div>
            <div className={`${eyebrow} text-muted-foreground`}>Arrematado por</div>
            <div className="flex h-11.5 items-center">
              <Bone className="h-10 w-56 rounded-md" />
            </div>
          </div>
          <dl className="m-0 grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-5 gap-y-2.5 text-sm">
            {RECEIPT_FIELDS.map((field) => (
              <div key={field.label} className="contents">
                <dt className="text-muted-foreground">{field.label}</dt>
                <dd className="m-0 flex h-5 items-center">
                  <Bone className={`h-3 ${field.bone}`} />
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2.5">
            <Bone className="h-9 w-52 rounded-lg" />
            <Bone className="h-9 w-44 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

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

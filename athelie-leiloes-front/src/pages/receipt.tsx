import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { Artwork, MuseumLabel } from '@/components/artwork';
import { Paddle } from '@/components/paddle';
import { ErrorWall } from '@/components/empty-wall';
import { Button } from '@/components/ui/button';
import { ErrorCode, ROUTES, auditPath, receiptPath } from '@/constants';
import { ApiError, api, assetUrl, errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { formatLongDate } from '@/lib/time';
import type { ReceiptView } from '@/types';

const eyebrow = 'text-[11.5px] font-semibold tracking-[0.14em] uppercase';

/** Sem a Clipboard API (http, permissão negada), cai no execCommand. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    return copied;
  }
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
  if (!current) {
    return (
      <p role="status" className="pt-7 text-muted-foreground">
        Carregando o comprovante…
      </p>
    );
  }
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
      <article className="grid max-w-230 items-start gap-9 rounded-[10px] border bg-card p-5.5 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:p-8">
        <Artwork src={assetUrl(lot.imageUrl)} alt={lot.title} />
        <div className="grid min-w-0 gap-5.5">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b pb-3">
            <h1 className={`${eyebrow} text-primary`}>Comprovante de arremate</h1>
            <span className="font-mono text-[12.5px] text-muted-foreground">{receipt.code}</span>
          </div>
          <MuseumLabel
            artist={lot.artist}
            title={lot.title}
            meta={[lot.date, lot.medium, lot.department].filter(Boolean).join(' · ')}
            titleClassName="text-[30px]"
          />
          <div>
            <div className={`${eyebrow} text-muted-foreground`}>Arrematado por</div>
            <div className="text-[46px] leading-none font-bold tracking-tight tabular-nums">{formatMoney(receipt.amount)}</div>
          </div>
          <dl className="m-0 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-5 gap-y-2.5 text-sm">
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
          <div className="flex flex-wrap gap-2.5">
            <Button type="button" onClick={() => void handleCopy()}>
              Copiar link do comprovante
            </Button>
            <Button asChild variant="outline">
              <Link to={auditPath(lot.id)}>Ver auditoria do lote</Link>
            </Button>
          </div>
          <p className="text-[13px] text-muted-foreground">
            Página pública. O vencedor aparece só pelo número da raquete, sem nome nem e-mail.
          </p>
        </div>
      </article>
    </div>
  );
}

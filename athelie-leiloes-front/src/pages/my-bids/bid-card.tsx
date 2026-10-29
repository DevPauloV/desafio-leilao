import { Link } from 'react-router';
import { cn } from 'cn';
import { ReceiptTextIcon, Share2Icon, ShieldCheckIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Artwork } from '@/components/artwork';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MyBidStatus, auditPath, lotPath, receiptPath } from '@/constants';
import { assetUrl } from '@/lib/api';
import { copyText } from '@/lib/clipboard';
import { formatMoney } from '@/lib/money';
import type { MyBidItem } from '@/types';
import { STATUS, currentLabel, deadline } from './bid-labels';
import { CARD_COLUMNS } from './bid-layout';

async function copyReceiptLink(code: string) {
  const link = `${window.location.origin}${receiptPath(code)}`;
  if (await copyText(link)) toast.success('Link do comprovante copiado');
  else toast.error('Não foi possível copiar. Abra o comprovante e copie o endereço da barra do navegador.');
}

export function BidCard({ item, now }: { item: MyBidItem; now: number }) {
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

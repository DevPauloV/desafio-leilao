import { Link } from 'react-router';
import { ArrowRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES, lotPath } from '@/constants';
import { formatMoney } from '@/lib/money';
import { formatShortDate } from '@/lib/time';
import type { Wallet } from '@/types';

const LINE = 'flex items-baseline justify-between gap-3 border-b border-dashed py-3';

/** Extrato: saldo total, menos cada lote em que o licitante lidera, igual ao que sobra para dar lances. */
export function Balances({ wallet }: { wallet: Wallet }) {
  const committedPercent = wallet.balance > 0 ? Math.min(100, (wallet.committed / wallet.balance) * 100) : 0;
  const lots = wallet.leading.length;
  return (
    <section aria-label="Extrato do saldo" className="grid grid-cols-1 rounded-[10px] border bg-card p-5 sm:px-7 sm:py-6">
      <div className="border-b pb-3 text-[11.5px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Extrato do saldo</div>

      <div className={LINE}>
        <span className="font-semibold">Saldo total</span>
        <span className="font-mono text-[15px] font-semibold tabular-nums">{formatMoney(wallet.balance)}</span>
      </div>

      {lots === 0 ? (
        <p className="border-b border-dashed py-3 text-sm text-muted-foreground">
          Você não está ganhando nenhum lote agora, então nada está comprometido.
        </p>
      ) : (
        <>
          <div className="pt-3 pb-0.5 text-xs font-semibold text-muted-foreground">
            Comprometido em {lots} {lots === 1 ? 'lote' : 'lotes'} · seu lance
          </div>
          <ul>
            {wallet.leading.map((item) => (
              <li key={item.lotId} className="flex items-baseline justify-between gap-3 border-b border-dashed py-2.5 pl-4.5">
                <div className="grid min-w-0 gap-0">
                  <Link to={lotPath(item.lotId)} className="text-[13.5px] font-semibold underline-offset-4 hover:text-primary hover:underline">
                    <span aria-hidden="true" className="mr-2 font-mono text-muted-foreground">
                      −
                    </span>
                    {item.title}
                  </Link>
                  <span className="text-[11.5px] text-muted-foreground">Termina {formatShortDate(item.endsAt)}</span>
                </div>
                <span className="font-mono text-[13.5px] whitespace-nowrap text-primary tabular-nums">{formatMoney(item.amount)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex items-baseline justify-between gap-3 py-3">
        <span className="font-semibold">Total comprometido</span>
        <span className="font-mono text-[15px] font-semibold text-primary tabular-nums">
          {wallet.committed > 0 && '− '}
          {formatMoney(wallet.committed)}
        </span>
      </div>

      <div className="flex flex-col items-start gap-1.5 border-t-[3px] border-double border-foreground pt-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <span className="font-semibold sm:max-w-[16ch]">Disponível para novos lances</span>
        <span className="text-[36px] leading-none font-bold tracking-tight whitespace-nowrap text-win tabular-nums sm:text-[40px]">
          {formatMoney(wallet.available, { short: true })}
        </span>
      </div>

      <div aria-hidden="true" className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-win-soft">
        <span className="bg-primary" style={{ width: `${committedPercent}%` }} />
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4.5 gap-y-1.5 text-[12.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-2.5 rounded-xs bg-primary" />
          Comprometido em {lots} {lots === 1 ? 'lote' : 'lotes'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-2.5 rounded-xs border border-win bg-win-soft" />
          Disponível para novos lances
        </span>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t pt-4">
        <p className="text-[12.5px] text-muted-foreground">Depósitos, lances e arremates, com o saldo depois de cada um.</p>
        <Button asChild variant="outline" className="max-sm:w-full">
          <Link to={ROUTES.EXTRACT}>
            Ver extrato completo
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

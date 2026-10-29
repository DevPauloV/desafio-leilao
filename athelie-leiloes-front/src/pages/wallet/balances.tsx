import { Link } from 'react-router';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { lotPath } from '@/constants';
import { formatMoney } from '@/lib/money';
import { formatShortDate } from '@/lib/time';
import type { Wallet } from '@/types';
import { Amount } from './amount';

export function Balances({ wallet }: { wallet: Wallet }) {
  const committedPercent = wallet.balance > 0 ? Math.min(100, (wallet.committed / wallet.balance) * 100) : 0;
  const lots = wallet.leading.length;
  return (
    <section aria-label="Saldos" className="grid grid-cols-1 gap-5.5 rounded-[10px] border bg-card p-6">
      <dl className="grid gap-4 sm:grid-cols-3">
        <Amount label="Saldo total" value={wallet.balance} />
        <Amount label="Comprometido" value={wallet.committed} />
        <Amount label="Disponível" value={wallet.available} className="text-win" />
      </dl>
      <div aria-hidden="true" className="flex h-2.5 overflow-hidden rounded-full bg-win-soft">
        <span className="bg-primary" style={{ width: `${committedPercent}%` }} />
      </div>
      <div className="flex flex-wrap gap-4.5 text-[12.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-2.5 rounded-xs bg-primary" />
          Comprometido em {lots} {lots === 1 ? 'lote' : 'lotes'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-2.5 rounded-xs border border-win bg-win-soft" />
          Disponível para novos lances
        </span>
      </div>

      {lots === 0 ? (
        <p className="text-sm text-muted-foreground">Você não está ganhando nenhum lote agora, então nada está comprometido.</p>
      ) : (
        <Table className="min-w-105">
          <TableHeader>
            <TableRow>
              <TableHead className="px-0">Comprometido em</TableHead>
              <TableHead>Seu lance</TableHead>
              <TableHead className="text-right">Termina</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {wallet.leading.map((item) => (
              <TableRow key={item.lotId}>
                <TableCell className="px-0 whitespace-normal">
                  <Link to={lotPath(item.lotId)} className="font-semibold underline-offset-4 hover:text-primary hover:underline">
                    {item.title}
                  </Link>
                </TableCell>
                <TableCell className="font-mono tabular-nums">{formatMoney(item.amount)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{formatShortDate(item.endsAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

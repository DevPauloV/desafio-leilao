import { Link } from 'react-router';
import { Paddle } from '@/components/paddle';
import { Button } from '@/components/ui/button';
import { receiptPath } from '@/constants';
import { formatMoney } from '@/lib/money';
import type { LotDetail } from '@/types';

export function LotResult({ lot }: { lot: LotDetail }) {
  const notice = 'rounded-lg bg-muted px-3.5 py-3 text-sm text-muted-foreground';
  const result = lot.result;
  if (!result) {
    return (
      <p role="status" className={notice}>
        Lote encerrado. Apurando resultado…
      </p>
    );
  }
  if (!result.sold || !result.winnerPseudonym || result.amount === null) {
    return (
      <p role="status" className={notice}>
        Encerrado sem lances.
      </p>
    );
  }
  const amount = formatMoney(result.amount);
  if (lot.me?.pseudonym === result.winnerPseudonym) {
    return (
      <div role="status" className="grid gap-2.5 rounded-lg bg-win-soft px-3.5 py-3 text-sm text-win">
        <div className="grid gap-0.5">
          <b className="text-[15px] font-semibold">Você arrematou este lote</b>
          <span>Seu lance de {amount} venceu.</span>
        </div>
        {lot.me.receiptCode ? (
          <Button asChild className="justify-self-start">
            <Link to={receiptPath(lot.me.receiptCode)}>Ver comprovante</Link>
          </Button>
        ) : (
          <span>Gerando o comprovante…</span>
        )}
      </div>
    );
  }
  return (
    <p role="status" className={notice}>
      Arrematado por <Paddle pseudonym={result.winnerPseudonym} /> por <b className="font-semibold text-foreground">{amount}</b>.
    </p>
  );
}

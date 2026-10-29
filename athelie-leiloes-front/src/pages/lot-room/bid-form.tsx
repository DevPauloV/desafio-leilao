import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ErrorAlert } from '@/components/error-alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSubmit } from '@/hooks/use-submit';
import { api } from '@/lib/api';
import { extendedToast } from '@/lib/lot-room';
import { formatMoney, formatMoneyInput, parseMoney } from '@/lib/money';
import { useWallet } from '@/lib/wallet';
import type { BidResponse, LotDetail } from '@/types';

const QUICK_BID_STEPS = [1, 3] as const;

export function BidForm({ lot, onChanged, onOwnBid }: { lot: LotDetail; onChanged: () => void; onOwnBid: (response: BidResponse) => void }) {
  const { wallet } = useWallet();
  const [amount, setAmount] = useState('');
  const { submitting, error: refusal, setError: setRefusal, submit } = useSubmit();

  const quick = [
    { label: 'mínimo', value: lot.minimumNextBid },
    ...QUICK_BID_STEPS.map((steps) => ({
      label: `+ ${formatMoney(lot.minIncrement * steps, { short: true })}`,
      value: lot.minimumNextBid + lot.minIncrement * steps,
    })),
  ];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cents = parseMoney(amount);
    if (!cents) {
      setRefusal(`Digite o valor do lance, ex.: ${formatMoneyInput(lot.minimumNextBid)}.`);
      return;
    }
    await submit(async () => {
      const result = await api<BidResponse>(`/api/lots/${lot.id}/bids`, { method: 'POST', body: { amount: cents } });
      onOwnBid(result);
      toast.success(`Lance de ${formatMoney(result.bid.amount)} aceito`);
      if (result.extended) extendedToast(lot.id, result.endsAt);
      setAmount('');
    });
    // Relê a posição (e o lote, se recusado); a carteira chega pelo `wallet:update`.
    onChanged();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-2.5">
      <div className="grid gap-1">
        <Label htmlFor="bid-amount" className="text-[13px] font-semibold">
          Seu lance
        </Label>
        <Input
          id="bid-amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder={formatMoneyInput(lot.minimumNextBid)}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-describedby="bid-hint"
          aria-invalid={refusal ? true : undefined}
          className="font-mono text-base"
        />
        <span id="bid-hint" className="text-[12.5px] text-muted-foreground">
          Lance mínimo aceito: {formatMoney(lot.minimumNextBid)} · disponível: {wallet ? formatMoney(wallet.available) : '—'}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Valores rápidos">
        {quick.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => setAmount(formatMoneyInput(option.value))}
            className="rounded-full border bg-card px-2.5 py-1 font-mono text-[12.5px] hover:bg-muted"
          >
            {option.label}
          </button>
        ))}
      </div>
      {refusal && <ErrorAlert>{refusal}</ErrorAlert>}
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Enviando lance…' : 'Dar lance'}
      </Button>
    </form>
  );
}

import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { toast } from 'sonner';
import { ErrorAlert } from '@/components/form';
import { Paddle } from '@/components/paddle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LotStatus, ROUTES, Role, receiptPath } from '@/constants';
import { useSubmit } from '@/hooks/use-submit';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { extendedToast } from '@/lib/lot-room';
import { formatMoney, formatMoneyInput, parseMoney } from '@/lib/money';
import { formatShortDate } from '@/lib/time';
import { useWallet } from '@/lib/wallet';
import type { BidResponse, LotDetail } from '@/types';

const QUICK_BID_STEPS = [1, 3] as const;

export function PositionBanner({ lot }: { lot: LotDetail }) {
  const me = lot.me;
  if (!me || me.position === null || lot.status !== LotStatus.LIVE) return null;
  const amount = formatMoney(lot.currentBid ?? 0);
  const [title, text] = me.isLeader
    ? ['Você está ganhando', `Seu lance de ${amount} está comprometido na carteira.`]
    : ['Você foi superado', 'O valor do seu lance já voltou para o saldo disponível.'];
  return (
    <div role="status" className={me.isLeader ? 'grid gap-0.5 rounded-lg bg-win-soft px-3.5 py-3 text-sm text-win' : 'grid gap-0.5 rounded-lg bg-warn-soft px-3.5 py-3 text-sm text-warn'}>
      <b className="text-[15px] font-semibold">{title}</b>
      <span>{text}</span>
    </div>
  );
}

export function BidArea({ lot, onChanged, onOwnBid }: { lot: LotDetail; onChanged: () => void; onOwnBid: (response: BidResponse) => void }) {
  const { user } = useAuth();
  const location = useLocation();
  const notice = 'rounded-lg bg-muted px-3.5 py-3 text-sm text-muted-foreground';

  if (lot.status === LotStatus.CANCELLED) return <p className={notice}>Este lote foi cancelado. Os lances não valem mais.</p>;
  if (lot.status === LotStatus.ENDED) return <LotResult lot={lot} />;
  if (!user) {
    return (
      <p className={notice}>
        <Link to={ROUTES.LOGIN} state={{ from: location.pathname }} className="font-semibold text-primary underline-offset-4 hover:underline">
          Entre para dar lances
        </Link>
        . Ainda não tem conta?{' '}
        <Link to={ROUTES.REGISTER} state={{ from: location.pathname }} className="text-primary underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
    );
  }
  if (user.role === Role.AUCTIONEER) return <p className={notice}>Leiloeiros não dão lances. Você pode acompanhar a sala.</p>;
  if (lot.status === LotStatus.SCHEDULED) {
    return <p className={notice}>Os lances abrem em {formatShortDate(lot.startsAt)}.</p>;
  }
  return <BidForm lot={lot} onChanged={onChanged} onOwnBid={onOwnBid} />;
}

function LotResult({ lot }: { lot: LotDetail }) {
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

function BidForm({ lot, onChanged, onOwnBid }: { lot: LotDetail; onChanged: () => void; onOwnBid: (response: BidResponse) => void }) {
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

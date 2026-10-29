import { useEffect, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router';
import { toast } from 'sonner';
import { Field } from '@/components/field';
import { Button } from '@/components/ui/button';
import { DEPOSIT_FIELD_ID, MAX_DEPOSIT } from '@/constants';
import { useSubmit } from '@/hooks/use-submit';
import { api } from '@/lib/api';
import { formatMoney, formatMoneyInput, moneyError, parseMoney } from '@/lib/money';
import { setWallet } from '@/lib/wallet';
import type { Wallet } from '@/types';

const QUICK_DEPOSITS = [100_000, 500_000, 1_000_000];

export function DepositForm() {
  const [value, setValue] = useState('');
  const { submitting, error, setError, submit } = useSubmit();
  const location = useLocation();

  // `location.key` refoca o campo quando o atalho "Depositar" é usado com a carteira já aberta.
  useEffect(() => {
    if (location.hash === `#${DEPOSIT_FIELD_ID}`) document.getElementById(DEPOSIT_FIELD_ID)?.focus();
  }, [location.hash, location.key]);

  const amount = parseMoney(value);
  const valueError = moneyError(value, '5.000,00') ?? (amount && amount > MAX_DEPOSIT ? `O máximo por depósito é ${formatMoney(MAX_DEPOSIT)}.` : null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (valueError || !amount) {
      setError(valueError);
      return;
    }
    setError(null);
    const ok = await submit(async () => setWallet(await api<Wallet>('/api/wallet/deposit', { method: 'POST', body: { amount } })));
    if (!ok) return;
    toast.success('Depósito feito', { description: `${formatMoney(amount)} entraram no seu saldo.` });
    setValue('');
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-3.5 rounded-[10px] border bg-card p-6">
      <h2 className="text-2xl font-bold tracking-tight">Depositar</h2>
      <p className="text-sm text-muted-foreground">Depósito simulado: nenhum dinheiro real é cobrado.</p>
      <Field
        id={DEPOSIT_FIELD_ID}
        label="Valor"
        inputMode="decimal"
        autoComplete="off"
        placeholder="5.000,00"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        hint={`Até ${formatMoney(MAX_DEPOSIT)} por depósito.`}
        error={value.trim() ? (valueError ?? error ?? undefined) : (error ?? undefined)}
        className="font-mono text-base"
      />
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Valores rápidos">
        {QUICK_DEPOSITS.map((cents) => (
          <button
            key={cents}
            type="button"
            onClick={() => setValue(formatMoneyInput(cents))}
            className="rounded-full border bg-card px-2.5 py-1 font-mono text-[12.5px] hover:bg-muted"
          >
            {formatMoney(cents, { short: true })}
          </button>
        ))}
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Depositando…' : 'Depositar'}
      </Button>
    </form>
  );
}

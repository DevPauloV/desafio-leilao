import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { toast } from 'sonner';
import { cn } from 'cn';
import { ErrorAlert, Field } from '@/components/form';
import { PageTitle } from '@/components/page-title';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DEPOSIT_FIELD_ID, MAX_DEPOSIT, ROLE_LABELS, Role, lotPath } from '@/constants';
import { api, errorMessage } from '@/lib/api';
import { formatMoney, formatMoneyInput, parseMoney } from '@/lib/money';
import { formatShortDate } from '@/lib/time';
import { loadWallet, setWallet, useWallet } from '@/lib/wallet';
import type { Wallet } from '@/types';

/** Valores dos botões rápidos de depósito, em centavos. */
const QUICK_DEPOSITS = [100_000, 500_000, 1_000_000];

export function WalletPage() {
  const { wallet, error } = useWallet();

  useEffect(() => {
    void loadWallet();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-7 pt-7">
      <PageTitle eyebrow={ROLE_LABELS[Role.BIDDER]} title="Carteira" />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {wallet ? (
          <Balances wallet={wallet} />
        ) : error ? (
          <div className="grid justify-items-start gap-3">
            <ErrorAlert>{error}</ErrorAlert>
            <Button type="button" variant="outline" onClick={() => void loadWallet()}>
              Tentar de novo
            </Button>
          </div>
        ) : (
          <p role="status" className="rounded-[10px] border bg-card p-6 text-muted-foreground">
            Carregando a carteira…
          </p>
        )}
        <DepositForm />
      </div>
    </div>
  );
}

function Balances({ wallet }: { wallet: Wallet }) {
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

function Amount({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div>
      <dt className="text-[12.5px] text-muted-foreground">{label}</dt>
      <dd className={cn('text-[34px] leading-[1.1] font-bold tracking-tight tabular-nums', className)}>
        {formatMoney(value, { short: true })}
      </dd>
    </div>
  );
}

function DepositForm() {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();

  // Atalho "Depositar" do cabeçalho: foca o campo (e rola até ele), também se a carteira já estiver aberta.
  useEffect(() => {
    if (location.hash === `#${DEPOSIT_FIELD_ID}`) document.getElementById(DEPOSIT_FIELD_ID)?.focus();
  }, [location.hash, location.key]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = parseMoney(value);
    if (!amount) {
      setError('Digite um valor maior que zero, ex.: 5.000,00.');
      return;
    }
    if (amount > MAX_DEPOSIT) {
      setError(`O máximo por depósito é ${formatMoney(MAX_DEPOSIT)}.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      setWallet(await api<Wallet>('/api/wallet/deposit', { method: 'POST', body: { amount } }));
      toast.success('Depósito feito', { description: `${formatMoney(amount)} entraram no seu saldo.` });
      setValue('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
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
        error={error ?? undefined}
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

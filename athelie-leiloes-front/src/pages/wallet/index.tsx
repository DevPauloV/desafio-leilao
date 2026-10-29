import { useEffect } from 'react';
import { ErrorWall } from '@/components/error-wall';
import { PageTitle } from '@/components/page-title';
import { ROLE_LABELS, Role } from '@/constants';
import { loadWallet, useWallet } from '@/lib/wallet';
import { Balances } from './balances';
import { BalancesSkeleton } from './balances-skeleton';
import { DepositForm } from './deposit-form';

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
          <ErrorWall title="A carteira não carregou" message={error} onRetry={() => void loadWallet()} />
        ) : (
          <BalancesSkeleton />
        )}
        <DepositForm />
      </div>
    </div>
  );
}

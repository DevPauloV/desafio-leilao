import { Link } from 'react-router';
import { ROUTES } from '@/constants';
import { formatMoney } from '@/lib/money';
import type { Wallet } from '@/types';

export function WalletBalance({ wallet }: { wallet: Wallet }) {
  return (
    <Link
      to={ROUTES.WALLET}
      aria-label={`Carteira: ${formatMoney(wallet.available)} disponível`}
      className="grid min-h-11 content-center justify-items-end gap-0.5 px-2 text-foreground no-underline md:px-0"
    >
      <span className="text-[9.5px] font-semibold tracking-[0.16em] text-muted-foreground uppercase md:text-[10.5px]">
        Saldo<span className="hidden md:inline"> disponível</span>
      </span>
      <span className="text-[13.5px] font-semibold tabular-nums md:text-[15px]">{formatMoney(wallet.available)}</span>
    </Link>
  );
}

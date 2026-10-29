import { Link, useLocation } from 'react-router';
import { LotStatus, ROUTES, Role } from '@/constants';
import { useAuth } from '@/lib/auth';
import { formatShortDate } from '@/lib/time';
import type { BidResponse, LotDetail } from '@/types';
import { BidForm } from './bid-form';
import { LotResult } from './lot-result';

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

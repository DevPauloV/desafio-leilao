import { Link, useParams } from 'react-router';
import { ErrorWall } from '@/components/error-wall';
import { ROUTES } from '@/constants';
import { useCrumbLot } from '@/hooks/use-crumb-lot';
import { useLotRoom } from '@/hooks/use-lot-room';
import { Room } from './room';
import { RoomSkeleton } from './room-skeleton';

export function LotRoomPage() {
  const { id = '' } = useParams();
  const { lot, error, refresh, applyOwnBid } = useLotRoom(id);
  useCrumbLot(lot?.id, lot?.title);

  if (error && !error.notFound) {
    return (
      <div className="pt-7">
        <ErrorWall title="A sala não carregou" message={error.message} onRetry={refresh} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="grid justify-items-start gap-3 pt-7">
        <h1 className="text-3xl font-bold tracking-tight">Lote não encontrado</h1>
        <Link to={ROUTES.SHOWCASE} className="text-primary underline-offset-4 hover:underline">
          Voltar para a vitrine
        </Link>
      </div>
    );
  }
  if (!lot) return <RoomSkeleton />;
  return <Room lot={lot} onChanged={refresh} onOwnBid={applyOwnBid} />;
}

import { Link } from 'react-router';
import { Artwork } from '@/components/artwork';
import { MuseumLabel } from '@/components/museum-label';
import { lotPath } from '@/constants';
import { assetUrl } from '@/lib/api';
import type { MyLot } from '@/types';

export function LotTitle({ lot }: { lot: MyLot }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Artwork src={assetUrl(lot.imageUrl)} alt="" thin className="w-11 flex-none" />
      <MuseumLabel
        compact
        title={
          <Link to={lotPath(lot.id)} className="underline-offset-4 hover:text-primary hover:underline">
            {lot.title}
          </Link>
        }
        meta={lot.artist}
        titleClassName="text-[15px]"
      />
    </div>
  );
}

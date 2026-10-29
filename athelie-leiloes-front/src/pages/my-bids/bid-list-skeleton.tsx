import { Bone } from '@/components/skeleton';
import { CARD_COLUMNS, GRID } from './bid-layout';

const SKELETON_CARDS = 4;

/** Mesma ficha das linhas reais: quando os lances chegam, nada muda de lugar. */
export function BidListSkeleton() {
  return (
    <div role="status" aria-label="Carregando seus lances" className="grid gap-5">
      <Bone row={0} className="h-9.5 w-full rounded-[8px] sm:w-105" />
      <div className={GRID}>
        {Array.from({ length: SKELETON_CARDS }, (_, row) => (
          <div key={row} className="@container overflow-hidden rounded-[10px] border bg-card">
            <div className={CARD_COLUMNS}>
              <Bone row={row} className="h-44 rounded-none bg-wall @max-[440px]:h-37.5" />
              <div className="grid content-start gap-3 p-4">
                <Bone row={row} className="h-6 w-24 rounded-full" />
                <Bone row={row} className="h-4 w-4/5" />
                <Bone row={row} className="h-3 w-2/5" />
                <Bone row={row} className="h-16 w-full" />
                <Bone row={row} className="h-9 w-full rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

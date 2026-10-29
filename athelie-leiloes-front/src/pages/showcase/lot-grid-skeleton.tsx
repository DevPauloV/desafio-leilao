import { Bone } from '@/components/skeleton';

const SKELETON_CARDS = 3;

/** Mesmas alturas do LotCard (obra, status, etiqueta, preço e botão): quando os lotes chegam, nada muda de lugar. */
export function LotGridSkeleton() {
  return (
    <div role="status" aria-label="Carregando lotes" className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: SKELETON_CARDS }, (_, row) => (
        <div key={row} className="grid gap-3">
          <Bone row={row} className="aspect-square rounded-[10px] bg-wall" />
          <div className="flex h-5 items-center justify-between">
            <Bone row={row} className="h-3 w-16" />
            <Bone row={row} className="h-3 w-24" />
          </div>
          <div className="grid gap-px">
            <div className="flex h-5 items-center">
              <Bone row={row} className="h-3.5 w-2/5" />
            </div>
            <div className="flex h-5.75 items-center">
              <Bone row={row} className="h-4.5 w-3/4" />
            </div>
            <div className="flex h-5 items-center">
              <Bone row={row} className="h-3 w-1/2" />
            </div>
          </div>
          <div className="grid">
            <div className="flex h-7 items-center">
              <Bone row={row} className="h-5 w-24 rounded-md" />
            </div>
            <div className="flex h-4 items-center">
              <Bone row={row} className="h-2.5 w-16" />
            </div>
          </div>
          <Bone row={row} className="h-8 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

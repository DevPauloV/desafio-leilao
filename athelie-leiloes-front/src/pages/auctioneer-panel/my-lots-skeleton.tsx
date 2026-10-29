import { Bone } from '@/components/skeleton';

const SKELETON_ROWS = 4;

/** Mesmo contorno da lista real, com blocos no lugar de cada linha. */
export function MyLotsSkeleton() {
  return (
    <div role="status" aria-label="Carregando seus lotes" className="divide-y rounded-[10px] border bg-card">
      {Array.from({ length: SKELETON_ROWS }, (_, row) => (
        <div key={row} className="flex items-center gap-3 p-3.5 md:px-4">
          <Bone row={row} className="aspect-4/5 w-11 flex-none rounded-md bg-wall" />
          <div className="grid flex-1 gap-2">
            <Bone row={row} className="h-3.5 w-3/5 md:w-2/5" />
            <Bone row={row} className="h-3 w-2/5 md:w-1/5" />
          </div>
          <Bone row={row} className="hidden h-6 w-22 rounded-full md:block" />
          <Bone row={row} className="h-4 w-20" />
          <Bone row={row} className="hidden h-8 w-8 rounded-md md:block" />
        </div>
      ))}
    </div>
  );
}

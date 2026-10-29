import { Bone } from '@/components/skeleton';

const ROWS = 6;

export function EntriesSkeleton() {
  return (
    <div role="status" aria-label="Carregando o extrato" className="divide-y rounded-[10px] border bg-card">
      {Array.from({ length: ROWS }, (_, row) => (
        <div key={row} className="flex h-17 items-center justify-between gap-4 px-4">
          <div className="grid gap-2">
            <Bone row={row} className="h-3.5 w-24" />
            <Bone row={row} className="h-3.5 w-48" />
          </div>
          <Bone row={row} className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

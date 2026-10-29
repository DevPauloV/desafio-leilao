import { cn } from 'cn';
import { Bone } from '@/components/skeleton';

// Uma linha só, em qualquer largura: a grade cresce quando os resultados chegam.
const MET_SKELETON_CARDS = ['grid', 'grid', 'hidden sm:grid', 'hidden xl:grid'];

export function MetResultsSkeleton() {
  return (
    <ul role="status" aria-label="Buscando no The Met" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {MET_SKELETON_CARDS.map((display, row) => (
        <li key={row} className={cn(display, 'content-start gap-2 rounded-lg border bg-card p-2')}>
          <Bone row={row} className="aspect-4/5 rounded-md bg-wall" />
          <Bone row={row} className="h-3 w-4/5" />
          <Bone row={row} className="h-2.5 w-3/5" />
        </li>
      ))}
    </ul>
  );
}

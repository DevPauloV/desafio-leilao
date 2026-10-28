import { Bone } from '@/components/skeleton';

const FACT_LABELS = ['Lance inicial', 'Incremento mínimo', 'Lances', 'Início', 'Fim', 'Auditoria'];

const SKELETON_BIDS = 4;

/** Mesmo layout de Room, com os rótulos fixos e blocos no lugar dos dados do lote. */
export function RoomSkeleton() {
  return (
    <div role="status" aria-label="Carregando o lote" className="grid items-start gap-10 pt-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div className="grid gap-5">
        <Bone className="aspect-4/5 max-w-130 rounded-[10px] bg-wall" />
        <div className="grid gap-px">
          <div className="flex h-5 items-center">
            <Bone className="h-3.5 w-40" />
          </div>
          <div className="flex h-9 items-center">
            <Bone className="h-6.5 w-3/4 max-w-100 rounded-md" />
          </div>
          <div className="flex h-5 items-center">
            <Bone className="h-3 w-56" />
          </div>
        </div>
        <dl className="grid max-w-130 grid-cols-2 gap-x-5 gap-y-2.5 border-t pt-4 text-[13.5px] sm:grid-cols-3">
          {FACT_LABELS.map((label) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="flex h-5 items-center">
                <Bone className="h-3 w-3/4" />
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <aside className="grid gap-4.5 rounded-[10px] border bg-card p-5.5">
        <div className="grid gap-1.5">
          <Bone className="h-3 w-40" />
          <div className="flex h-[clamp(44px,6vw,60px)] items-center">
            <Bone className="h-4/5 w-56 rounded-md" />
          </div>
          <Bone className="h-3 w-32" />
        </div>
        <div className="grid gap-2 border-y py-3">
          <Bone className="h-3 w-24" />
          <Bone className="h-6.5 w-36 rounded-md" />
          <Bone className="h-3 w-full" />
        </div>
        <div className="grid gap-2">
          <Bone className="h-3.5 w-20" />
          <div className="flex gap-2">
            <Bone className="h-10 flex-1 rounded-lg" />
            <Bone className="h-10 w-28 rounded-lg" />
          </div>
        </div>
        <div className="grid">
          <span className="pb-2 text-[13px] font-semibold tracking-widest text-muted-foreground uppercase">Histórico de lances</span>
          <ol className="grid">
            {Array.from({ length: SKELETON_BIDS }, (_, row) => (
              <li key={row} className="grid grid-cols-[36px_minmax(0,1fr)_auto_auto] items-center gap-3 border-t py-3">
                <Bone row={row} className="h-3 w-6" />
                <Bone row={row} className="h-3 w-24" />
                <Bone row={row} className="h-3 w-16" />
                <Bone row={row} className="h-3 w-12" />
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}

import type { MyLot } from '@/types';
import { LiveLot } from './live-lot';

/** Lotes ao vivo em destaque, o que termina antes primeiro. */
export function LiveNow({ lots, now, onCancel }: { lots: MyLot[]; now: number; onCancel: (lot: MyLot) => void }) {
  const sorted = [...lots].sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());
  return (
    <section aria-labelledby="live-now-heading" className="grid grid-cols-1 gap-3">
      <h2 id="live-now-heading" className="flex items-center gap-2 text-[13px] font-semibold tracking-widest text-primary uppercase">
        <span aria-hidden="true" className="size-1.75 rounded-full bg-current motion-safe:animate-live" />
        Acontecendo agora
      </h2>
      <ul className="grid gap-3">
        {sorted.map((lot) => (
          <LiveLot key={lot.id} lot={lot} now={now} onCancel={onCancel} />
        ))}
      </ul>
    </section>
  );
}

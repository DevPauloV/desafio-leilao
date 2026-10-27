import type { ReactNode } from 'react';

// Lista vazia como uma parede de galeria: moldura vazia pendurada na mesma cor "parede" dos cards de obra.
// `searching` põe uma lupa bordô na moldura, para o filtro que não achou nada.

export function EmptyWall({ title, searching = false, children }: { title: string; searching?: boolean; children?: ReactNode }) {
  return (
    <div role="status" className="grid justify-items-center gap-2.5 rounded-[10px] bg-wall px-5 pt-10 pb-11 text-center">
      <EmptyFrame searching={searching} />
      <h2 className="max-w-[30ch] text-[19px] leading-tight font-extrabold tracking-[-0.02em]">{title}</h2>
      {children}
    </div>
  );
}

function EmptyFrame({ searching }: { searching: boolean }) {
  return (
    <svg viewBox="0 0 132 112" aria-hidden="true" className="h-28 w-33 text-muted-foreground">
      <circle cx="66" cy="7" r="3" fill="currentColor" opacity="0.6" />
      <path d="M66 9 34 34M66 9l32 25" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
      <rect x="30" y="34" width="72" height="64" rx="1.5" className="fill-background/70" />
      <rect x="30" y="34" width="72" height="64" rx="1.5" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.55" />
      <rect x="42" y="46" width="48" height="40" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
      {searching && (
        <g className="text-primary">
          <circle cx="98" cy="86" r="13" className="fill-card" stroke="currentColor" strokeWidth="4" />
          <path d="m107.5 95.5 9 9" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

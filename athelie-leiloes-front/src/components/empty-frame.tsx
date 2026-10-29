export function EmptyFrame({ searching = false, fallen = false }: { searching?: boolean; fallen?: boolean }) {
  return (
    <svg viewBox="0 0 132 112" aria-hidden="true" className="h-28 w-33 text-muted-foreground">
      <circle cx="66" cy="7" r="3" fill="currentColor" opacity="0.6" />
      {fallen ? (
        <path d="M66 9 36 38M66 9l14 12" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
      ) : (
        <path d="M66 9 34 34M66 9l32 25" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
      )}
      <g transform={fallen ? 'rotate(14 66 66)' : undefined}>
        <rect x="30" y="34" width="72" height="64" rx="1.5" className="fill-background/70" />
        <rect x="30" y="34" width="72" height="64" rx="1.5" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.55" />
        <rect x="42" y="46" width="48" height="40" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
      </g>
      {searching && (
        <g className="text-primary">
          <circle cx="98" cy="86" r="13" className="fill-card" stroke="currentColor" strokeWidth="4" />
          <path d="m107.5 95.5 9 9" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

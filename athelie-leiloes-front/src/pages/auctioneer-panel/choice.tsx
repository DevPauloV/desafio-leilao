import type { ReactNode } from 'react';
import { cn } from 'cn';

export function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'h-9 rounded-md border bg-card px-3.5 text-[13px] font-semibold transition-colors hover:border-primary/60',
        on && 'border-primary bg-primary-soft text-primary',
      )}
    >
      {children}
    </button>
  );
}

import { useId, type ReactNode } from 'react';

export function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="grid gap-2.5">
      <h3 id={id} className="text-[11px] font-bold tracking-[0.09em] text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

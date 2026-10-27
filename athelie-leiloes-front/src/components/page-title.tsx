import type { ReactNode } from 'react';

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      {eyebrow && <span className="text-[11.5px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{eyebrow}</span>}
      <h1 className="text-[clamp(30px,4.4vw,44px)] leading-[1.08] font-bold tracking-tight">{title}</h1>
      {children && <p className="max-w-[62ch] text-muted-foreground">{children}</p>}
    </div>
  );
}

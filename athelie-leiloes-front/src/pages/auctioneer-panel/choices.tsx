import type { ReactNode } from 'react';

export function Choices({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="grid gap-1.5">
      <span className="text-[13px] font-semibold">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

import type { ReactNode } from 'react';
import { cn } from 'cn';

export function ErrorAlert({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      role="alert"
      className={cn('rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-sm text-destructive', className)}
    >
      {children}
    </p>
  );
}

import type { ReactNode } from 'react';
import { cn } from 'cn';

/** `money`: marca em bordô o item do estorno, o que mexe com o saldo de alguém. */
export function CancelConsequence({ money = false, children }: { money?: boolean; children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span aria-hidden="true" className={cn('mt-2 size-1.5 flex-none rounded-full', money ? 'bg-primary' : 'bg-border')} />
      <span>{children}</span>
    </li>
  );
}

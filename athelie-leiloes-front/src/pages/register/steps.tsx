import { cn } from 'cn';
import { CheckIcon } from 'lucide-react';
import type { Step } from './step';

const STEPS = ['Perfil', 'Seus dados'] as const;

export function Steps({ current }: { current: Step }) {
  return (
    <ol className="flex gap-5 text-xs text-muted-foreground" aria-label="Etapas do cadastro">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} aria-current={active ? 'step' : undefined} className={cn('flex items-center gap-2', active && 'font-semibold text-foreground')}>
            <span
              className={cn(
                'grid size-5 place-items-center rounded-full border text-[11px]',
                active && 'border-primary bg-primary text-primary-foreground',
                done && 'border-win-soft bg-win-soft text-win',
              )}
              aria-hidden="true"
            >
              {done ? <CheckIcon className="size-3" /> : index + 1}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

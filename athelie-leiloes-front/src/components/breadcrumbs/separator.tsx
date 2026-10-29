import { ChevronRightIcon } from 'lucide-react';

export function Separator({ className }: { className?: string }) {
  return (
    <li aria-hidden="true" className={className ?? 'flex'}>
      <ChevronRightIcon className="size-3.5 flex-none text-muted-foreground/70" />
    </li>
  );
}

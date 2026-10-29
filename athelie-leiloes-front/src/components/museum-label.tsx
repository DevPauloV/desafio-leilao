import type { ReactNode } from 'react';
import { cn } from 'cn';

export function MuseumLabel({
  artist,
  title,
  meta,
  titleClassName,
  compact = false,
}: {
  artist?: string | null;
  title: ReactNode;
  meta?: string | null;
  titleClassName?: string;
  /** Trunca cada linha para os cards da vitrine terem a mesma altura. */
  compact?: boolean;
}) {
  const line = compact && 'truncate';
  return (
    <div className="grid min-w-0 gap-px">
      {artist && <span className={cn('text-sm font-semibold', line)}>{artist}</span>}
      <span className={cn('text-lg leading-tight font-semibold tracking-[-0.01em]', line, titleClassName)}>{title}</span>
      {meta && <span className={cn('text-[13px] text-muted-foreground', line)}>{meta}</span>}
    </div>
  );
}

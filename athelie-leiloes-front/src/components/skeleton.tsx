import { cn } from 'cn';

const SKELETON_STAGGER_MS = 120;

/** Bloco de esqueleto com brilho; `row` atrasa o brilho para as linhas não piscarem juntas. */
export function Bone({ row = 0, className }: { row?: number; className: string }) {
  return (
    <span
      className={cn('skeleton block rounded bg-muted motion-reduce:animate-none', className)}
      style={{ animationDelay: `${row * SKELETON_STAGGER_MS}ms` }}
    />
  );
}

import type { ReactNode } from 'react';
import { EmptyFrame } from './empty-frame';
import { WALL, WALL_TITLE } from './wall-classes';

export function EmptyWall({ title, searching = false, children }: { title: string; searching?: boolean; children?: ReactNode }) {
  return (
    <div role="status" className={WALL}>
      <EmptyFrame searching={searching} />
      <h2 className={WALL_TITLE}>{title}</h2>
      {children}
    </div>
  );
}

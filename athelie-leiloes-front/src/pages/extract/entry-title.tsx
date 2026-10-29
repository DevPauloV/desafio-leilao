import { Link } from 'react-router';
import { lotPath } from '@/constants';
import type { WalletEntry } from '@/types';
import { DEPOSIT_TITLE } from './entry-view';

export function EntryTitle({ entry }: { entry: WalletEntry }) {
  if (!entry.lotId) return <span className="truncate font-semibold">{DEPOSIT_TITLE}</span>;
  return (
    <Link to={lotPath(entry.lotId)} className="max-w-full truncate font-semibold underline-offset-4 hover:text-primary hover:underline">
      {entry.lotTitle}
    </Link>
  );
}

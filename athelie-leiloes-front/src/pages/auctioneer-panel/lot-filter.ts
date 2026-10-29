import { LOCALE, LotStatus } from '@/constants';
import type { MyLot } from '@/types';

export const ALL_STATUSES = 'all';
export type StatusFilter = typeof ALL_STATUSES | LotStatus;

export const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: ALL_STATUSES, label: 'Todos' },
  { value: LotStatus.LIVE, label: 'Ao vivo' },
  { value: LotStatus.SCHEDULED, label: 'Agendados' },
  { value: LotStatus.ENDED, label: 'Encerrados' },
  { value: LotStatus.CANCELLED, label: 'Cancelados' },
];

export const isStatusFilter = (value: string): value is StatusFilter => STATUS_OPTIONS.some((option) => option.value === value);

export function matchesFilter(lot: MyLot, status: StatusFilter, query: string): boolean {
  if (status !== ALL_STATUSES && lot.status !== status) return false;
  const needle = query.trim().toLocaleLowerCase(LOCALE);
  return !needle || [lot.title, lot.artist ?? ''].some((text) => text.toLocaleLowerCase(LOCALE).includes(needle));
}

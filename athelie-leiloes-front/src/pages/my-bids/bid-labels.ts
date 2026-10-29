import { LotStatus, MyBidStatus } from '@/constants';
import { formatCountdown, formatShortDate } from '@/lib/time';
import type { MyBidItem } from '@/types';

export const Filter = { ALL: 'all', OPEN: 'open', WON: 'won', CLOSED: 'closed' } as const;
export type Filter = (typeof Filter)[keyof typeof Filter];

export const FILTERS = [
  { value: Filter.ALL, label: 'Todos' },
  { value: Filter.OPEN, label: 'Em disputa' },
  { value: Filter.WON, label: 'Arrematados' },
  { value: Filter.CLOSED, label: 'Encerrados' },
] as const;

export const isFilter = (value: string): value is Filter => FILTERS.some((f) => f.value === value);

export const STATUS: Record<
  MyBidStatus,
  { label: string; variant: 'win' | 'warn' | 'accent' | 'neutral'; filter: Filter; action: string; primary: boolean }
> = {
  [MyBidStatus.OUTBID]: { label: 'Superado', variant: 'warn', filter: Filter.OPEN, action: 'Cobrir lance', primary: true },
  [MyBidStatus.WINNING]: { label: 'Ganhando', variant: 'win', filter: Filter.OPEN, action: 'Abrir sala', primary: false },
  [MyBidStatus.WON]: { label: 'Arrematado', variant: 'accent', filter: Filter.WON, action: 'Comprovante', primary: true },
  [MyBidStatus.LOST]: { label: 'Não arrematado', variant: 'neutral', filter: Filter.CLOSED, action: 'Ver resultado', primary: false },
  [MyBidStatus.CANCELLED]: { label: 'Cancelado', variant: 'neutral', filter: Filter.CLOSED, action: 'Ver lote', primary: false },
};

/** Quem pede ação primeiro; o sort estável mantém a ordem da API dentro de cada situação. */
export const URGENCY: MyBidStatus[] = [MyBidStatus.OUTBID, MyBidStatus.WINNING, MyBidStatus.WON, MyBidStatus.LOST, MyBidStatus.CANCELLED];

/** Rótulo e valor do prazo: contagem enquanto o lote está ao vivo, data nos demais. */
export function deadline(item: MyBidItem, now: number): { label: string; value: string; clock: boolean } {
  const { lot, myStatus } = item;
  if (myStatus === MyBidStatus.CANCELLED) return { label: 'Lote', value: 'Cancelado pelo leiloeiro', clock: false };
  if (lot.status === LotStatus.LIVE) return { label: 'Termina em', value: formatCountdown(new Date(lot.endsAt).getTime() - now), clock: true };
  if (lot.status === LotStatus.SCHEDULED) return { label: 'Termina em', value: formatShortDate(lot.endsAt), clock: false };
  return { label: myStatus === MyBidStatus.WON ? 'Arrematado em' : 'Encerrado em', value: formatShortDate(lot.endsAt), clock: false };
}

export function currentLabel(item: MyBidItem): string {
  if (item.myStatus === MyBidStatus.CANCELLED) return 'Último lance';
  return item.lot.status === LotStatus.LIVE ? 'Lance atual' : 'Valor final';
}

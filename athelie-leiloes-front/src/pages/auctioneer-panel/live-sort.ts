import type { MyLot } from '@/types';

export const LiveSort = {
  ENDING: 'ending',
  HIGHEST: 'highest',
  BIDS: 'bids',
} as const;
export type LiveSort = (typeof LiveSort)[keyof typeof LiveSort];

export const LIVE_SORT_OPTIONS: { value: LiveSort; label: string }[] = [
  { value: LiveSort.ENDING, label: 'Termina primeiro' },
  { value: LiveSort.HIGHEST, label: 'Maior lance' },
  { value: LiveSort.BIDS, label: 'Mais lances' },
];

const currentValue = (lot: MyLot) => lot.currentBid ?? lot.startingBid;

const COMPARE: Record<LiveSort, (a: MyLot, b: MyLot) => number> = {
  [LiveSort.ENDING]: (a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime(),
  [LiveSort.HIGHEST]: (a, b) => currentValue(b) - currentValue(a),
  [LiveSort.BIDS]: (a, b) => b.bidCount - a.bidCount,
};

export const sortLive = (lots: MyLot[], sort: LiveSort) => [...lots].sort(COMPARE[sort]);

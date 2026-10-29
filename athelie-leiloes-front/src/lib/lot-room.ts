import { toast } from 'sonner';
import { ANTI_SNIPING_EXTENSION_MS, ANTI_SNIPING_WINDOW_MS, LOT_DETAIL_BIDS_LIMIT, SocketEvent } from '@/constants';
import type { BidNewEvent, LotDetail } from '@/types';
import { formatTime, MINUTE_MS } from './time';

export const ANTI_SNIPING_TEXT = `Um lance nos últimos ${ANTI_SNIPING_WINDOW_MS / MINUTE_MS} minutos estende o fim para ${
  ANTI_SNIPING_EXTENSION_MS / MINUTE_MS
} minutos depois dele.`;

/** Uma resposta atrasada não apaga lance mais novo: `bidCount` só cresce. */
export function newerOf(current: LotDetail | null, next: LotDetail): LotDetail {
  return current && current.id === next.id && next.bidCount < current.bidCount ? current : next;
}

type BidUpdate = Omit<BidNewEvent, 'lotId' | 'serverTime'> & { serverTime?: string };

/** Chega pelo `bid:new` e pela resposta do POST: `seq` repetido ou mais antigo é ignorado. */
export function withBid(lot: LotDetail, update: BidUpdate): LotDetail {
  if (update.bid.seq <= (lot.bids[0]?.seq ?? 0)) return lot;
  return {
    ...lot,
    bids: [update.bid, ...lot.bids].slice(0, LOT_DETAIL_BIDS_LIMIT),
    currentBid: update.currentBid,
    minimumNextBid: update.minimumNextBid,
    endsAt: update.endsAt,
    bidCount: Math.max(lot.bidCount, update.bidCount),
    serverTime: update.serverTime ?? lot.serverTime,
    me: lot.me && { ...lot.me, isLeader: update.bid.pseudonym === lot.me.pseudonym },
  };
}

export const extendedToast = (lotId: string, endsAt: string) =>
  toast.info(`Prorrogado: novo fim às ${formatTime(endsAt)}`, {
    id: `${SocketEvent.LOT_EXTENDED}:${lotId}:${endsAt}`, // o mesmo aviso não aparece duas vezes (POST e socket)
    description: ANTI_SNIPING_TEXT,
  });

export const isClosing = (lot: LotDetail, now: number) => new Date(lot.endsAt).getTime() - now <= ANTI_SNIPING_WINDOW_MS;

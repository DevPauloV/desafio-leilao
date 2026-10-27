// Funções puras: recebem `now` em vez de ler o relógio, para os testes cobrirem as bordas.
import {
  ANTI_SNIPING_EXTENSION_MS,
  ANTI_SNIPING_WINDOW_MS,
  ErrorCode,
  LotState,
  LotStatus,
  Role,
} from '../constants.js';

type LotTiming = { state: string; startsAt: Date; endsAt: Date };
type LotPricing = { startingBid: number; minIncrement: number; currentBid?: number | null };

export function lotStatus(lot: LotTiming, now: Date): LotStatus {
  if (lot.state === LotState.CANCELLED) return LotStatus.CANCELLED;
  if (lot.state !== LotState.ACTIVE) return LotStatus.ENDED;
  if (now < lot.startsAt) return LotStatus.SCHEDULED;
  if (now < lot.endsAt) return LotStatus.LIVE;
  return LotStatus.ENDED; // ativo com fim vencido: aguardando a varredura liquidar
}

export function minimumNextBid(lot: LotPricing): number {
  return lot.currentBid == null ? lot.startingBid : lot.currentBid + lot.minIncrement;
}

export type BidAttempt = {
  lot: LotTiming & LotPricing & { leaderId: string | null };
  user: { id: string; role: string; wallet: { balance: number; committed: number } };
  amount: number;
  now: Date;
};

export type BidRejection = { code: ErrorCode; details?: Record<string, unknown> };

const STATUS_REJECTION: Partial<Record<LotStatus, ErrorCode>> = {
  [LotStatus.SCHEDULED]: ErrorCode.LOT_NOT_STARTED,
  [LotStatus.ENDED]: ErrorCode.LOT_ENDED,
  [LotStatus.CANCELLED]: ErrorCode.LOT_CANCELLED,
};

export function validateBid({ lot, user, amount, now }: BidAttempt): BidRejection | null {
  if (user.role !== Role.BIDDER) return { code: ErrorCode.AUCTIONEER_CANNOT_BID };

  const statusRejection = STATUS_REJECTION[lotStatus(lot, now)];
  if (statusRejection === ErrorCode.LOT_NOT_STARTED) return { code: statusRejection, details: { startsAt: lot.startsAt } };
  if (statusRejection) return { code: statusRejection };

  if (lot.leaderId === user.id) return { code: ErrorCode.ALREADY_WINNING };

  const minimum = minimumNextBid(lot);
  if (amount < minimum) return { code: ErrorCode.BID_TOO_LOW, details: { minimum } };

  const available = user.wallet.balance - user.wallet.committed;
  if (amount > available) return { code: ErrorCode.INSUFFICIENT_FUNDS, details: { available } };

  return null;
}

export function antiSniping(endsAt: Date, now: Date): { endsAt: Date; extended: boolean } {
  if (endsAt.getTime() - now.getTime() < ANTI_SNIPING_WINDOW_MS) {
    return { endsAt: new Date(now.getTime() + ANTI_SNIPING_EXTENSION_MS), extended: true };
  }
  return { endsAt, extended: false };
}

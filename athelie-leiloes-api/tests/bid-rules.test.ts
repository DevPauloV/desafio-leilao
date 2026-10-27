import { describe, expect, it } from 'vitest';
import { ErrorCode, LotState, LotStatus, Role } from '../src/constants.js';
import { antiSniping, lotStatus, minimumNextBid, validateBid } from '../src/domain/bid-rules.js';

const startsAt = new Date('2026-10-25T12:00:00Z');
const endsAt = new Date('2026-10-25T13:00:00Z');
const at = (iso: string) => new Date(iso);

describe('lotStatus', () => {
  it('cancelado é sempre cancelled, mesmo dentro do horário', () => {
    expect(lotStatus({ state: LotState.CANCELLED, startsAt, endsAt }, at('2026-10-25T12:30:00Z'))).toBe(
      LotStatus.CANCELLED,
    );
  });

  it('settled é ended, mesmo dentro do horário', () => {
    for (const state of [LotState.SETTLED]) {
      expect(lotStatus({ state, startsAt, endsAt }, at('2026-10-25T12:30:00Z'))).toBe(LotStatus.ENDED);
    }
  });

  it('ativo antes do início é scheduled', () => {
    expect(lotStatus({ state: LotState.ACTIVE, startsAt, endsAt }, at('2026-10-25T11:59:59.999Z'))).toBe(
      LotStatus.SCHEDULED,
    );
  });

  it('ativo de startsAt (inclusive) até endsAt (exclusive) é live', () => {
    const lot = { state: LotState.ACTIVE, startsAt, endsAt };
    expect(lotStatus(lot, startsAt)).toBe(LotStatus.LIVE);
    expect(lotStatus(lot, at('2026-10-25T12:59:59.999Z'))).toBe(LotStatus.LIVE);
  });

  it('ativo com o fim vencido é ended (aguardando a liquidação)', () => {
    const lot = { state: LotState.ACTIVE, startsAt, endsAt };
    expect(lotStatus(lot, endsAt)).toBe(LotStatus.ENDED);
    expect(lotStatus(lot, at('2026-10-26T00:00:00Z'))).toBe(LotStatus.ENDED);
  });
});

describe('minimumNextBid', () => {
  it('sem lances é o lance inicial', () => {
    expect(minimumNextBid({ startingBid: 10_000, minIncrement: 500, currentBid: null })).toBe(10_000);
  });

  it('com lances é o atual + incremento', () => {
    expect(minimumNextBid({ startingBid: 10_000, minIncrement: 500, currentBid: 12_000 })).toBe(12_500);
  });
});

describe('validateBid', () => {
  const now = at('2026-10-25T12:30:00Z');
  const bidder = { id: 'licitante', role: Role.BIDDER, wallet: { balance: 100_000, committed: 0 } };
  const liveLot = { state: LotState.ACTIVE, startsAt, endsAt, startingBid: 10_000, minIncrement: 500 };
  const noBids = { ...liveLot, currentBid: null, leaderId: null };
  const withBids = { ...liveLot, currentBid: 12_000, leaderId: 'outro' };

  it('primeiro lance igual ao inicial é aceito; 1 centavo abaixo é BID_TOO_LOW', () => {
    expect(validateBid({ lot: noBids, user: bidder, amount: 10_000, now })).toBeNull();
    expect(validateBid({ lot: noBids, user: bidder, amount: 9_999, now })).toEqual({
      code: ErrorCode.BID_TOO_LOW,
      details: { minimum: 10_000 },
    });
  });

  it('lance seguinte igual a atual + incremento é aceito; 1 centavo abaixo é BID_TOO_LOW', () => {
    expect(validateBid({ lot: withBids, user: bidder, amount: 12_500, now })).toBeNull();
    expect(validateBid({ lot: withBids, user: bidder, amount: 12_499, now })).toEqual({
      code: ErrorCode.BID_TOO_LOW,
      details: { minimum: 12_500 },
    });
  });

  it('leiloeiro → AUCTIONEER_CANNOT_BID, antes de qualquer outra regra', () => {
    const auctioneer = { ...bidder, role: Role.AUCTIONEER };
    const cancelled = { ...noBids, state: LotState.CANCELLED };
    expect(validateBid({ lot: cancelled, user: auctioneer, amount: 1, now })?.code).toBe(ErrorCode.AUCTIONEER_CANNOT_BID);
  });

  it('agendado → LOT_NOT_STARTED com startsAt; encerrado → LOT_ENDED; cancelado → LOT_CANCELLED', () => {
    expect(validateBid({ lot: noBids, user: bidder, amount: 10_000, now: at('2026-10-25T11:00:00Z') })).toEqual({
      code: ErrorCode.LOT_NOT_STARTED,
      details: { startsAt },
    });
    expect(validateBid({ lot: noBids, user: bidder, amount: 10_000, now: endsAt })?.code).toBe(ErrorCode.LOT_ENDED);
    const settled = { ...noBids, state: LotState.SETTLED };
    expect(validateBid({ lot: settled, user: bidder, amount: 10_000, now })?.code).toBe(ErrorCode.LOT_ENDED);
    const cancelled = { ...noBids, state: LotState.CANCELLED };
    expect(validateBid({ lot: cancelled, user: bidder, amount: 10_000, now })?.code).toBe(ErrorCode.LOT_CANCELLED);
  });

  it('líder atual → ALREADY_WINNING, mesmo com valor baixo', () => {
    const leading = { ...withBids, leaderId: bidder.id };
    expect(validateBid({ lot: leading, user: bidder, amount: 1, now })?.code).toBe(ErrorCode.ALREADY_WINNING);
  });

  it('INSUFFICIENT_FUNDS olha o disponível (total − comprometido), não o total', () => {
    const user = { ...bidder, wallet: { balance: 20_000, committed: 15_000 } };
    expect(validateBid({ lot: noBids, user, amount: 10_000, now })).toEqual({
      code: ErrorCode.INSUFFICIENT_FUNDS,
      details: { available: 5_000 },
    });
    const exact = { ...bidder, wallet: { balance: 20_000, committed: 10_000 } };
    expect(validateBid({ lot: noBids, user: exact, amount: 10_000, now })).toBeNull();
  });
});

describe('antiSniping', () => {
  const end = at('2026-10-25T13:00:00Z');

  it('faltando 2:00 exatos, não prorroga', () => {
    expect(antiSniping(end, at('2026-10-25T12:58:00Z'))).toEqual({ endsAt: end, extended: false });
  });

  it('faltando 1:59,999, o fim vira o horário do lance + 2 min', () => {
    const now = at('2026-10-25T12:58:00.001Z');
    expect(antiSniping(end, now)).toEqual({ endsAt: at('2026-10-25T13:00:00.001Z'), extended: true });
  });

  it('com bastante tempo sobrando, não mexe no fim', () => {
    expect(antiSniping(end, at('2026-10-25T12:00:00Z'))).toEqual({ endsAt: end, extended: false });
  });
});

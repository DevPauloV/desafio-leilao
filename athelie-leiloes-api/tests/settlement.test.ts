import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LotState, LotStatus, Role, SETTLEMENT_SWEEP_INTERVAL_MS } from '../src/constants.js';
import { Bid } from '../src/models/Bid.js';
import { Image } from '../src/models/Image.js';
import { Lot } from '../src/models/Lot.js';
import { User } from '../src/models/User.js';
import { bidAs, depositFor, insertLot, registerUser, startTestApp, type TestUser } from './setup.js';

const MINUTE = 60_000;
const RECEIPT_CODE = /^[A-Za-z0-9_-]{22}$/;

let app: Express;
let stop: () => Promise<void>;
let settleDueLots: (now?: Date) => Promise<number>;
let startSettlementSweep: () => NodeJS.Timeout;
let auctioneer: TestUser;
let alice: TestUser;
let bruno: TestUser;

beforeAll(async () => {
  ({ app, stop } = await startTestApp());
  ({ settleDueLots, startSettlementSweep } = await import('../src/jobs/settlement.js'));
  auctioneer = await registerUser(app, Role.AUCTIONEER);
  alice = await registerUser(app, Role.BIDDER);
  bruno = await registerUser(app, Role.BIDDER);
}, 120_000);

afterAll(async () => {
  await stop?.();
});

beforeEach(async () => {
  await Promise.all([Lot.deleteMany({}), Bid.deleteMany({}), Image.deleteMany({})]);
  await User.updateMany({}, { $set: { wallet: { balance: 0, committed: 0 } } });
});

const walletOf = async (user: TestUser) => (await User.findById(user.id).lean())!.wallet;
const endNow = (lotId: string) => Lot.updateOne({ _id: lotId }, { $set: { endsAt: new Date(Date.now() - 1) } });

async function lotWonByBruno() {
  await depositFor(app, alice, 50_000);
  await depositFor(app, bruno, 50_000);
  const lot = await insertLot(auctioneer.id);
  await bidAs(app, alice, lot.id, 1_000);
  await bidAs(app, bruno, lot.id, 1_100);
  await endNow(lot.id);
  return lot;
}

describe('liquidação', () => {
  it('com vencedor: debita o vencedor, credita o leiloeiro e gera o comprovante', async () => {
    const lot = await lotWonByBruno();

    expect(await settleDueLots()).toBe(1);

    expect(await walletOf(bruno)).toEqual({ balance: 48_900, committed: 0 });
    expect(await walletOf(alice)).toEqual({ balance: 50_000, committed: 0 });
    expect(await walletOf(auctioneer)).toEqual({ balance: 1_100, committed: 0 });
    const settled = (await Lot.findById(lot.id).lean())!;
    const lastBid = (await Bid.findOne({ lotId: lot._id, seq: 2 }).lean())!;
    expect(settled.state).toBe(LotState.SETTLED);
    expect(settled.result).toMatchObject({
      winnerPseudonym: lastBid.pseudonym,
      amount: 1_100,
      receiptCode: expect.stringMatching(RECEIPT_CODE),
      chainHash: settled.chainHead.lastHash,
    });
    expect(settled.result!.winnerId?.toString()).toBe(bruno.id);
    expect(settled.result!.settledAt).toBeInstanceOf(Date);
  });

  it('sem lances: fecha sem vencedor e sem comprovante', async () => {
    const lot = await insertLot(auctioneer.id, { endsAt: new Date(Date.now() - MINUTE), startsAt: new Date(Date.now() - 60 * MINUTE) });

    await settleDueLots();

    const settled = (await Lot.findById(lot.id).lean())!;
    expect(settled.state).toBe(LotState.SETTLED);
    expect(settled.result).toMatchObject({ winnerId: null, winnerPseudonym: null, amount: null, receiptCode: null });
    expect(await walletOf(auctioneer)).toEqual({ balance: 0, committed: 0 });
  });

  it('duas varreduras em paralelo no mesmo lote: um único débito e um único comprovante', async () => {
    const lot = await lotWonByBruno();

    const counts = await Promise.all([settleDueLots(), settleDueLots(), settleDueLots()]);

    expect(counts.reduce((sum, n) => sum + n, 0)).toBe(1);
    expect(await walletOf(bruno)).toEqual({ balance: 48_900, committed: 0 });
    expect(await walletOf(auctioneer)).toEqual({ balance: 1_100, committed: 0 });
    expect(await Lot.countDocuments({ 'result.receiptCode': { $type: 'string' } })).toBe(1);
    expect((await Lot.findById(lot.id).lean())!.state).toBe(LotState.SETTLED);
  });

  it('lote prorrogado por um lance de última hora não é liquidado antes do novo fim', async () => {
    await depositFor(app, alice, 50_000);
    const lot = await insertLot(auctioneer.id, { endsAt: new Date(Date.now() + 30_000) });
    const res = await bidAs(app, alice, lot.id, 1_000);
    expect(res.body.extended).toBe(true);

    // Varredura no horário do fim original: o lote já não está vencido.
    expect(await settleDueLots(new Date(Date.now() + 60_000))).toBe(0);
    expect((await Lot.findById(lot.id).lean())!.state).toBe(LotState.ACTIVE);

    expect(await settleDueLots(new Date(Date.now() + 3 * MINUTE))).toBe(1);
    expect((await Lot.findById(lot.id).lean())!.state).toBe(LotState.SETTLED);
  });

  it('a varredura ao subir pega lotes que venceram com a API desligada', async () => {
    const lot = await insertLot(auctioneer.id, {
      startsAt: new Date(Date.now() - 120 * MINUTE),
      endsAt: new Date(Date.now() - 60 * MINUTE),
    });

    const timer = startSettlementSweep();
    try {
      await expect.poll(async () => (await Lot.findById(lot.id).lean())?.state, { timeout: 5_000 }).toBe(LotState.SETTLED);
    } finally {
      clearInterval(timer);
    }
  });
});

describe('liquidação sob demanda (instância pausada sem varredura)', () => {
  it('a primeira requisição depois do intervalo liquida o que venceu; outra dentro do intervalo não varre de novo', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const lot = await lotWonByBruno();
      vi.setSystemTime(Date.now() + SETTLEMENT_SWEEP_INTERVAL_MS);

      const detail = await request(app).get(`/api/lots/${lot.id}`);
      expect(detail.body.result).toMatchObject({ sold: true, amount: 1_100 });

      const other = await insertLot(auctioneer.id, { endsAt: new Date(Date.now() - 1) });
      await request(app).get(`/api/lots/${other.id}`);
      expect((await Lot.findById(other.id).lean())!.state).toBe(LotState.ACTIVE);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('depois de liquidar', () => {
  it('o detalhe traz o resultado público e o comprovante só para o vencedor', async () => {
    const lot = await lotWonByBruno();
    await settleDueLots();
    const detail = (user?: TestUser) => {
      const req = request(app).get(`/api/lots/${lot.id}`);
      return user ? req.set('Authorization', `Bearer ${user.token}`) : req;
    };

    const anonymous = (await detail()).body;
    expect(anonymous.status).toBe(LotStatus.ENDED);
    expect(anonymous.result).toEqual({
      sold: true,
      winnerPseudonym: expect.stringMatching(/^Licitante #/),
      amount: 1_100,
      settledAt: expect.any(String),
    });
    const winner = (await detail(bruno)).body.me;
    expect(winner.receiptCode).toMatch(RECEIPT_CODE);
    expect((await detail(alice)).body.me).not.toHaveProperty('receiptCode');

    const myLots = await request(app).get('/api/me/lots').set('Authorization', `Bearer ${auctioneer.token}`);
    expect(myLots.body.items[0].result).toEqual({ sold: true, amount: 1_100 });
    expect(myLots.body.totalReceived).toBe(1_100);
  });

  it('GET /api/receipts/:code traz obra, valor e pseudônimo, sem dados pessoais', async () => {
    const lot = await lotWonByBruno();
    await settleDueLots();
    const { result, chainHead } = (await Lot.findById(lot.id).lean())!;

    const res = await request(app).get(`/api/receipts/${result!.receiptCode}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      code: result!.receiptCode,
      lot: {
        id: lot.id,
        title: 'Obra',
        artist: null,
        date: null,
        medium: null,
        department: null,
        imageUrl: `/api/images/${lot.item.imageId.toString()}`,
        metUrl: null,
      },
      winnerPseudonym: result!.winnerPseudonym,
      amount: 1_100,
      settledAt: result!.settledAt.toISOString(),
      chainHash: chainHead.lastHash,
    });
    const json = JSON.stringify(res.body);
    for (const forbidden of ['@example.com', 'winnerId', 'bidderId', bruno.id, alice.id, auctioneer.id]) {
      expect(json).not.toContain(forbidden);
    }
  });

  it('código inexistente ou malformado → 404', async () => {
    expect((await request(app).get(`/api/receipts/${'A'.repeat(22)}`)).status).toBe(404);
    expect((await request(app).get('/api/receipts/curto')).status).toBe(404);
  });
});

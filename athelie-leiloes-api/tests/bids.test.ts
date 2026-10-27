import type { Express } from 'express';
import { Types } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ErrorCode, GENESIS_HASH, LotState, MAX_DEPOSIT, Role } from '../src/constants.js';
import { bidHash, headSignature } from '../src/domain/audit-chain.js';
import { formatBRL } from '../src/errors.js';
import { Bid } from '../src/models/Bid.js';
import { Image } from '../src/models/Image.js';
import { Lot } from '../src/models/Lot.js';
import { User } from '../src/models/User.js';
import { TEST_AUDIT_SECRET, insertLot, registerUser, startTestApp } from './setup.js';

const MINUTE = 60_000;
type TestUser = { token: string; id: string };

let app: Express;
let stop: () => Promise<void>;
let auctioneer: TestUser;
let alice: TestUser;
let bruno: TestUser;
let carla: TestUser;

beforeAll(async () => {
  ({ app, stop } = await startTestApp());
  auctioneer = await registerUser(app, Role.AUCTIONEER);
  alice = await registerUser(app, Role.BIDDER);
  bruno = await registerUser(app, Role.BIDDER);
  carla = await registerUser(app, Role.BIDDER);
}, 120_000);

afterAll(async () => {
  await stop?.();
});

beforeEach(async () => {
  await Promise.all([Lot.deleteMany({}), Bid.deleteMany({}), Image.deleteMany({})]);
  await User.updateMany({}, { $set: { wallet: { balance: 0, committed: 0 } } });
});

const auth = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` });
const fromNow = (ms: number) => new Date(Date.now() + ms);
const lotOf = (overrides: Record<string, unknown> = {}) => insertLot(auctioneer.id, overrides);
const bid = (lotId: string, amount: number, user: TestUser) =>
  request(app).post(`/api/lots/${lotId}/bids`).set(auth(user)).send({ amount });
const deposit = (user: TestUser, amount: unknown) =>
  request(app).post('/api/wallet/deposit').set(auth(user)).send({ amount });
const walletOf = async (user: TestUser) => (await request(app).get('/api/wallet').set(auth(user))).body;
const committedOf = async (id: string) => (await User.findById(id).lean())?.wallet.committed;

describe('carteira', () => {
  it('depósito soma no saldo e a carteira mostra total, comprometido e disponível', async () => {
    await deposit(alice, 30_000);
    const res = await deposit(alice, 20_000);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ balance: 50_000, committed: 0, available: 50_000, leading: [] });
  });

  it('recusa depósito fora de 1..MAX_DEPOSIT ou não inteiro, com mensagem legível', async () => {
    const zero = await deposit(alice, 0);
    expect(zero.status).toBe(400);
    expect(zero.body.error.details.fields.amount).toBe('O depósito precisa ser maior que zero.');

    const tooBig = await deposit(alice, MAX_DEPOSIT + 1);
    expect(tooBig.body.error.details.fields.amount).toBe(
      `O depósito pode ser de no máximo ${formatBRL(MAX_DEPOSIT)}.`,
    );
    expect((await deposit(alice, 10.5)).status).toBe(400);
    expect((await deposit(alice, '100')).status).toBe(400);
    expect((await deposit(alice, MAX_DEPOSIT)).status).toBe(200);
  });

  it('leiloeiro não tem carteira de licitante (403)', async () => {
    const res = await request(app).get('/api/wallet').set(auth(auctioneer));
    expect(res.status).toBe(403);
  });
});

describe('POST /api/lots/:id/bids', () => {
  it('lance aceito compromete o valor e entra em wallet.leading', async () => {
    await deposit(alice, 50_000);
    const lot = await lotOf();

    const res = await bid(lot.id, 1_000, alice);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      bid: { seq: 1, amount: 1_000, pseudonym: expect.stringMatching(/^Licitante #[A-F\d]{6}$/) },
      currentBid: 1_000,
      minimumNextBid: 1_100,
      extended: false,
    });
    expect(res.body.bid).not.toHaveProperty('bidderId');
    expect(await walletOf(alice)).toEqual({
      balance: 50_000,
      committed: 1_000,
      available: 49_000,
      leading: [{ lotId: lot.id, title: 'Obra', amount: 1_000, endsAt: lot.endsAt.toISOString() }],
    });
  });

  it('superado libera o comprometido do líder anterior na hora, e a cadeia fica encadeada', async () => {
    await deposit(alice, 50_000);
    await deposit(bruno, 50_000);
    const lot = await lotOf();

    await bid(lot.id, 1_000, alice);
    const res = await bid(lot.id, 1_100, bruno);

    expect(res.status).toBe(201);
    expect(await committedOf(alice.id)).toBe(0);
    expect(await committedOf(bruno.id)).toBe(1_100);
    expect((await walletOf(alice)).leading).toEqual([]);

    const [first, second] = await Bid.find({ lotId: lot._id }).sort({ seq: 1 }).lean();
    expect(first!.prevHash).toBe(GENESIS_HASH);
    expect(second!.prevHash).toBe(first!.hash);
    expect(second!.hash).toBe(
      bidHash(TEST_AUDIT_SECRET, { ...second!, lotId: lot.id }),
    );
    const updated = await Lot.findById(lot.id).lean();
    expect(updated).toMatchObject({ currentBid: 1_100, bidCount: 2 });
    expect(updated!.leaderId?.toString()).toBe(bruno.id);
    expect(updated!.chainHead).toEqual({
      lastHash: second!.hash,
      signature: headSignature(TEST_AUDIT_SECRET, lot.id, 2, second!.hash),
    });
  });

  it('INSUFFICIENT_FUNDS olha o disponível, com o valor em R$ na mensagem', async () => {
    await deposit(alice, 2_000);
    const leading = await lotOf();
    const other = await lotOf();
    await bid(leading.id, 1_500, alice);

    const res = await bid(other.id, 1_000, alice);

    expect(res.status).toBe(422);
    expect(res.body.error).toEqual({
      code: ErrorCode.INSUFFICIENT_FUNDS,
      message: `Saldo disponível insuficiente. Você tem ${formatBRL(500)}.`,
      details: { available: 500 },
    });
    expect(res.body.error.message).toMatch(/R\$\s5,00/);
  });

  it('BID_TOO_LOW traz o mínimo formatado em R$', async () => {
    await deposit(bruno, 500_000);
    const lot = await lotOf({ startingBid: 105_000 });

    const res = await bid(lot.id, 104_999, bruno);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe(ErrorCode.BID_TOO_LOW);
    expect(res.body.error.message).toMatch(/^O lance mínimo aceito é R\$\s1\.050,00\.$/);
    expect(res.body.error.details).toEqual({ minimum: 105_000 });
  });

  it('leiloeiro → AUCTIONEER_CANNOT_BID', async () => {
    const lot = await lotOf();
    const res = await bid(lot.id, 1_000, auctioneer);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ErrorCode.AUCTIONEER_CANNOT_BID);
  });

  it('agendado, encerrado e cancelado → LOT_NOT_STARTED, LOT_ENDED, LOT_CANCELLED', async () => {
    await deposit(carla, 50_000);
    const scheduled = await lotOf({ startsAt: fromNow(MINUTE), endsAt: fromNow(60 * MINUTE) });
    const ended = await lotOf({ startsAt: fromNow(-60 * MINUTE), endsAt: fromNow(-MINUTE) });
    const cancelled = await lotOf({ state: LotState.CANCELLED });

    const notStarted = await bid(scheduled.id, 1_000, carla);
    expect(notStarted.status).toBe(409);
    expect(notStarted.body.error).toMatchObject({
      code: ErrorCode.LOT_NOT_STARTED,
      details: { startsAt: scheduled.startsAt.toISOString() },
    });
    expect((await bid(ended.id, 1_000, carla)).body.error.code).toBe(ErrorCode.LOT_ENDED);
    expect((await bid(cancelled.id, 1_000, carla)).body.error.code).toBe(ErrorCode.LOT_CANCELLED);
    expect(await committedOf(carla.id)).toBe(0);
  });

  it('líder não cobre o próprio lance (ALREADY_WINNING)', async () => {
    await deposit(carla, 50_000);
    const lot = await lotOf();
    await bid(lot.id, 1_000, carla);

    const res = await bid(lot.id, 5_000, carla);

    expect(res.body.error.code).toBe(ErrorCode.ALREADY_WINNING);
    expect(await committedOf(carla.id)).toBe(1_000);
  });

  it('anti-sniping: lance nos últimos 2 min leva o fim para o horário do lance + 2 min', async () => {
    await deposit(bruno, 50_000);
    const lot = await lotOf({ endsAt: fromNow(30_000) });

    const before = Date.now();
    const res = await bid(lot.id, 1_000, bruno);

    expect(res.body.extended).toBe(true);
    const newEnd = new Date(res.body.endsAt).getTime();
    expect(newEnd).toBeGreaterThanOrEqual(before + 2 * MINUTE);
    expect(newEnd).toBeLessThanOrEqual(Date.now() + 2 * MINUTE);
    expect((await Lot.findById(lot.id).lean())?.endsAt.getTime()).toBe(newEnd);
  });

  it('valida entrada: sem login 401, lote inexistente 404, valor quebrado 400', async () => {
    const lot = await lotOf();
    expect((await request(app).post(`/api/lots/${lot.id}/bids`).send({ amount: 1_000 })).status).toBe(401);
    expect((await bid(new Types.ObjectId().toString(), 1_000, carla)).status).toBe(404);
    expect((await bid('nao-e-id', 1_000, carla)).status).toBe(404);
    const broken = await bid(lot.id, 10.5, carla);
    expect(broken.status).toBe(400);
    expect(broken.body.error.details.fields.amount).toBe('Informe um valor válido para o lance.');
  });
});

describe('GET /api/lots/:id com lances', () => {
  it('traz os lances mais recentes primeiro e o "me" do licitante, sem dados pessoais', async () => {
    await deposit(alice, 50_000);
    await deposit(bruno, 50_000);
    const lot = await lotOf();
    const first = await bid(lot.id, 1_000, alice);
    await bid(lot.id, 1_100, bruno);
    const detail = (user?: TestUser) => {
      const req = request(app).get(`/api/lots/${lot.id}`);
      return user ? req.set(auth(user)) : req;
    };

    const asAlice = await detail(alice);
    expect(asAlice.body.bids.map((b: { seq: number }) => b.seq)).toEqual([2, 1]);
    expect(asAlice.body.me).toEqual({
      pseudonym: first.body.bid.pseudonym,
      isLeader: false,
      position: 2,
      totalBidders: 2,
    });
    expect((await detail(bruno)).body.me).toMatchObject({ isLeader: true, position: 1, totalBidders: 2 });

    const asCarla = (await detail(carla)).body.me;
    expect(asCarla).toMatchObject({ isLeader: false, position: null, totalBidders: 2 });
    expect(asCarla.pseudonym).toMatch(/^Licitante #/);

    const anonymous = await detail();
    expect(anonymous.body).not.toHaveProperty('me');
    expect((await detail(auctioneer)).body).not.toHaveProperty('me');

    for (const res of [anonymous, asAlice]) {
      const json = JSON.stringify(res.body);
      for (const forbidden of ['bidderId', 'leaderId', 'auctioneerId', '@example.com', alice.id, bruno.id]) {
        expect(json).not.toContain(forbidden);
      }
    }
  });
});

describe('cancelamento depois de lances reais', () => {
  it('estorna o comprometido do líder e o lote para de aceitar lances', async () => {
    await deposit(alice, 50_000);
    await deposit(bruno, 50_000);
    const lot = await lotOf();
    await bid(lot.id, 1_000, alice);
    await bid(lot.id, 1_100, bruno);

    const res = await request(app).post(`/api/lots/${lot.id}/cancel`).set(auth(auctioneer));

    expect(res.body).toMatchObject({ status: 'cancelled', refunded: true });
    expect(await committedOf(alice.id)).toBe(0);
    expect(await committedOf(bruno.id)).toBe(0);
    expect((await bid(lot.id, 1_200, alice)).body.error.code).toBe(ErrorCode.LOT_CANCELLED);
  });
});

describe('concorrência', () => {
  const crowd: TestUser[] = [];

  beforeAll(async () => {
    for (let i = 0; i < 10; i++) crowd.push(await registerUser(app, Role.BIDDER));
  });

  async function fundCrowd(amount: number) {
    await Promise.all(crowd.map((user) => deposit(user, amount)));
  }

  async function sumCommitted() {
    const users = await User.find({ _id: { $in: crowd.map((user) => user.id) } }).lean();
    return users.reduce((sum, user) => sum + user.wallet.committed, 0);
  }

  it('10 lances simultâneos com o mesmo valor mínimo: exatamente 1 aceito, os outros BID_TOO_LOW', async () => {
    await fundCrowd(100_000);
    const lot = await lotOf({ startingBid: 5_000 });

    const results = await Promise.all(crowd.map((user) => bid(lot.id, 5_000, user)));

    expect(results.filter((res) => res.status === 201)).toHaveLength(1);
    const rejected = results.filter((res) => res.status !== 201);
    expect(rejected.map((res) => res.body.error.code)).toEqual(Array(9).fill(ErrorCode.BID_TOO_LOW));
    const seqs = (await Bid.find({ lotId: lot._id }).sort({ seq: 1 }).lean()).map((b) => b.seq);
    expect(seqs).toEqual([1]);
    expect((await Lot.findById(lot.id).lean())?.currentBid).toBe(5_000);
    expect(await sumCommitted()).toBe(5_000);
  });

  it('10 lances simultâneos com valores diferentes: seq 1..N sem buracos e só o líder fica comprometido', async () => {
    await fundCrowd(100_000);
    const lot = await lotOf({ startingBid: 5_000 });

    const results = await Promise.all(crowd.map((user, i) => bid(lot.id, 5_000 + i * 1_000, user)));

    const accepted = results.filter((res) => res.status === 201);
    expect(accepted.length).toBeGreaterThanOrEqual(1);
    for (const res of results.filter((r) => r.status !== 201)) expect(res.body.error.code).toBe(ErrorCode.BID_TOO_LOW);

    const bids = await Bid.find({ lotId: lot._id }).sort({ seq: 1 }).lean();
    expect(bids.map((b) => b.seq)).toEqual(accepted.map((_, i) => i + 1));
    bids.forEach((b, i) => expect(b.prevHash).toBe(i === 0 ? GENESIS_HASH : bids[i - 1]!.hash));
    const updated = await Lot.findById(lot.id).lean();
    expect(updated?.bidCount).toBe(accepted.length);
    expect(updated?.currentBid).toBe(bids.at(-1)!.amount);
    expect(await sumCommitted()).toBe(updated?.currentBid);
  });

  it('um licitante com 2 lances simultâneos em lotes diferentes não passa do saldo', async () => {
    const [user] = crowd;
    await deposit(user!, 10_000);
    const lots = [await lotOf(), await lotOf()];

    const results = await Promise.all(lots.map((lot) => bid(lot.id, 7_000, user!)));

    expect(results.map((res) => res.status).sort()).toEqual([201, 422]);
    expect(results.find((res) => res.status === 422)?.body.error.code).toBe(ErrorCode.INSUFFICIENT_FUNDS);
    expect(await committedOf(user!.id)).toBe(7_000);
  });
});

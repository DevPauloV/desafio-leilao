import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Role, WalletEntryType } from '../src/constants.js';
import { Bid } from '../src/models/Bid.js';
import { Lot } from '../src/models/Lot.js';
import { User } from '../src/models/User.js';
import { WalletEntry } from '../src/models/WalletEntry.js';
import { insertLot, registerUser, startTestApp } from './setup.js';

const MINUTE = 60_000;
type TestUser = { token: string; id: string };

let app: Express;
let stop: () => Promise<void>;
let settleDueLots: typeof import('../src/jobs/settlement.js').settleDueLots;
let auctioneer: TestUser;
let alice: TestUser;
let bruno: TestUser;

beforeAll(async () => {
  ({ app, stop } = await startTestApp());
  ({ settleDueLots } = await import('../src/jobs/settlement.js'));
  auctioneer = await registerUser(app, Role.AUCTIONEER);
  alice = await registerUser(app, Role.BIDDER);
  bruno = await registerUser(app, Role.BIDDER);
}, 120_000);

afterAll(async () => {
  await stop?.();
});

beforeEach(async () => {
  await Promise.all([Lot.deleteMany({}), Bid.deleteMany({}), WalletEntry.deleteMany({})]);
  await User.updateMany({}, { $set: { wallet: { balance: 0, committed: 0 } } });
});

const auth = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` });
const live = () => insertLot(auctioneer.id, { startsAt: new Date(Date.now() - MINUTE), endsAt: new Date(Date.now() + 60 * MINUTE) });
const deposit = (user: TestUser, amount: number) => request(app).post('/api/wallet/deposit').set(auth(user)).send({ amount });
const bid = (lotId: string, amount: number, user: TestUser) => request(app).post(`/api/lots/${lotId}/bids`).set(auth(user)).send({ amount });
const entries = (user: TestUser, query = '') => request(app).get(`/api/wallet/entries?period=all${query}`).set(auth(user));

describe('extrato da carteira', () => {
  it('registra depósito, lance, lance superado e arremate com o saldo depois de cada um', async () => {
    const lot = await live();
    const lotId = lot._id.toString();
    await deposit(alice, 50_000);
    await deposit(bruno, 50_000);
    await bid(lotId, 10_000, alice);
    await bid(lotId, 15_000, bruno);
    await Lot.updateOne({ _id: lot._id }, { $set: { endsAt: new Date(Date.now() - 1000) } });
    await settleDueLots();

    const aliceEntries = (await entries(alice)).body.items;
    expect(aliceEntries.map((item: { type: string }) => item.type)).toEqual([
      WalletEntryType.RELEASE,
      WalletEntryType.HOLD,
      WalletEntryType.DEPOSIT,
    ]);
    expect(aliceEntries[0]).toMatchObject({ amount: 10_000, balance: 50_000, available: 50_000, lotId });
    expect(aliceEntries[1]).toMatchObject({ amount: 10_000, balance: 50_000, available: 40_000 });

    const brunoEntries = (await entries(bruno)).body.items;
    expect(brunoEntries[0]).toMatchObject({ type: WalletEntryType.WIN, amount: 15_000, balance: 35_000, available: 35_000 });
    expect(brunoEntries[0]).not.toHaveProperty('userId');
  });

  it('registra o estorno quando o leiloeiro cancela o lote', async () => {
    const lot = await live();
    await deposit(alice, 20_000);
    await bid(lot._id.toString(), 8_000, alice);
    await request(app).post(`/api/lots/${lot._id}/cancel`).set(auth(auctioneer));

    const [first] = (await entries(alice)).body.items;
    expect(first).toMatchObject({ type: WalletEntryType.REFUND, amount: 8_000, balance: 20_000, available: 20_000 });
  });

  it('filtra por tipo e por período, pagina, e só mostra os movimentos de quem pede', async () => {
    const lot = await live();
    await deposit(alice, 20_000);
    await bid(lot._id.toString(), 8_000, alice);
    await WalletEntry.updateOne({ type: WalletEntryType.DEPOSIT }, { $set: { createdAt: new Date(Date.now() - 30 * 24 * 60 * MINUTE) } });

    expect((await entries(alice, '&type=deposits')).body.total).toBe(1);
    expect((await entries(alice, '&type=bids')).body.total).toBe(1);
    const week = await request(app).get('/api/wallet/entries?period=7d').set(auth(alice));
    expect(week.body.total).toBe(1);
    expect((await entries(alice, '&page=2')).body.items).toEqual([]);
    expect((await entries(bruno)).body.total).toBe(0);
  });

  it('recusa filtro inválido e exige login de licitante', async () => {
    expect((await entries(alice, '&type=outro')).status).toBe(400);
    expect((await request(app).get('/api/wallet/entries')).status).toBe(401);
    expect((await entries(auctioneer)).status).toBe(403);
  });
});

import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LotState, LotStatus } from '../src/constants.js';
import { lotStatus } from '../src/domain/bid-rules.js';
import { Lot, type LotDoc } from '../src/models/Lot.js';
import { User } from '../src/models/User.js';
import type * as SeedModule from '../src/seed/seed.js';
import { startTestApp } from './setup.js';

let app: Express;
let stop: () => Promise<void>;
let seed: typeof SeedModule;
let settleDueLots: (now?: Date) => Promise<number>;

beforeAll(async () => {
  ({ app, stop } = await startTestApp());
  seed = await import('../src/seed/seed.js');
  ({ settleDueLots } = await import('../src/jobs/settlement.js'));
}, 120_000);

afterAll(async () => {
  await stop?.();
});

const seedUser = (email: string) => User.findOne({ email }).lean();
async function seedLots() {
  const auctioneer = await seedUser(seed.SEED_ACCOUNTS.auctioneer.email);
  return Lot.find({ auctioneerId: auctioneer!._id }).lean();
}
const byStatus = (lots: LotDoc[], status: string) => lots.filter((lot) => lotStatus(lot, new Date()) === status);

/** committed = soma dos lances que o licitante lidera; balance = depósito − arremates; leiloeiro = soma das vendas. */
async function expectWalletsToClose() {
  const lots = await seedLots();
  for (const account of [seed.SEED_ACCOUNTS.bidder01, seed.SEED_ACCOUNTS.bidder02]) {
    const user = (await seedUser(account.email))!;
    const id = user._id.toString();
    const leading = lots.filter((lot) => lot.state === LotState.ACTIVE && lot.leaderId?.toString() === id);
    const won = lots.filter((lot) => lot.result?.winnerId?.toString() === id);
    expect(user.wallet.committed).toBe(leading.reduce((sum, lot) => sum + lot.currentBid!, 0));
    expect(user.wallet.balance).toBe(seed.SEED_DEPOSIT - won.reduce((sum, lot) => sum + lot.result!.amount!, 0));
  }
  const auctioneer = (await seedUser(seed.SEED_ACCOUNTS.auctioneer.email))!;
  const sold = lots.filter((lot) => lot.result?.winnerId != null);
  expect(auctioneer.wallet.balance).toBe(sold.reduce((sum, lot) => sum + lot.result!.amount!, 0));
}

describe('seed', () => {
  it('cria as 3 contas e os 4 lotes; rodar de novo não duplica nada', async () => {
    expect(await seed.runSeed()).toEqual({ accounts: 3, lots: 4 });
    expect(await seed.runSeed()).toEqual({ accounts: 0, lots: 0 });

    const emails = Object.values(seed.SEED_ACCOUNTS).map((account) => account.email);
    expect(await User.countDocuments({ email: { $in: emails } })).toBe(3);
    const lots = await seedLots();
    expect(lots).toHaveLength(4);

    const [live] = byStatus(lots, LotStatus.LIVE);
    expect(live).toMatchObject({ bidCount: seed.SEED_LOTS.live.bids.length, currentBid: 175_000 });
    expect(byStatus(lots, LotStatus.SCHEDULED)).toHaveLength(1);
    const [ended] = byStatus(lots, LotStatus.ENDED);
    expect(ended).toMatchObject({ state: LotState.SETTLED, result: { amount: 210_000 } });
    expect(ended!.result!.receiptCode).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(byStatus(lots, LotStatus.CANCELLED)).toHaveLength(1);
  });

  it('as contas entram com a senha do seed', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: seed.SEED_ACCOUNTS.bidder01.email, password: seed.SEED_PASSWORD });
    expect(res.status).toBe(200);
  });

  it('a auditoria de todos os lotes do seed é íntegra e as carteiras fecham', async () => {
    for (const lot of await seedLots()) {
      const res = await request(app).get(`/api/audit/lots/${lot._id.toString()}`);
      expect(res.body.verdict).toEqual({ intact: true });
    }
    await expectWalletsToClose();
  });

  it('quando o lote ao vivo acaba, o próximo seed cria outro (e tudo continua íntegro)', async () => {
    const [live] = byStatus(await seedLots(), LotStatus.LIVE);
    await Lot.updateOne({ _id: live!._id }, { $set: { endsAt: new Date(Date.now() - 1) } });

    expect(await seed.runSeed()).toEqual({ accounts: 0, lots: 1 });
    await settleDueLots();

    const lots = await seedLots();
    expect(byStatus(lots, LotStatus.LIVE)).toHaveLength(1);
    expect(lots).toHaveLength(5);
    for (const lot of lots) {
      const res = await request(app).get(`/api/audit/lots/${lot._id.toString()}`);
      expect(res.body.verdict).toEqual({ intact: true });
    }
    await expectWalletsToClose();
  });
});

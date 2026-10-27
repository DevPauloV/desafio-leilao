import type { Express } from 'express';
import { Types } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuditProblem, ErrorCode, GENESIS_HASH, LotStatus, MyBidStatus, Role } from '../src/constants.js';
import { Bid } from '../src/models/Bid.js';
import { Image } from '../src/models/Image.js';
import { Lot } from '../src/models/Lot.js';
import { User } from '../src/models/User.js';
import { bidAs, depositFor, insertLot, registerUser, startTestApp, type TestUser } from './setup.js';

let app: Express;
let stop: () => Promise<void>;
let settleDueLots: (now?: Date) => Promise<number>;
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
  await Promise.all([Lot.deleteMany({}), Bid.deleteMany({}), Image.deleteMany({})]);
  await User.updateMany({}, { $set: { wallet: { balance: 0, committed: 0 } } });
  await depositFor(app, alice, 100_000);
  await depositFor(app, bruno, 100_000);
});

const audit = async (lotId: string) => (await request(app).get(`/api/audit/lots/${lotId}`)).body;

/** X 1.000, Y 1.100, X 1.200 (X vence); licitantes novos a cada lote, para não esbarrar no rate limit de lances. */
async function lotWithThreeBids() {
  const [x, y] = [await registerUser(app, Role.BIDDER), await registerUser(app, Role.BIDDER)];
  await Promise.all([depositFor(app, x, 100_000), depositFor(app, y, 100_000)]);
  const lot = await insertLot(auctioneer.id);
  await bidAs(app, x, lot.id, 1_000);
  await bidAs(app, y, lot.id, 1_100);
  await bidAs(app, x, lot.id, 1_200);
  return lot;
}

const bidOf = (lotId: string, seq: number) => Bid.findOne({ lotId, seq }).lean();
const validity = (body: { bids: { seq: number; valid: boolean }[] }) => body.bids.map((b) => [b.seq, b.valid]);

describe('GET /api/audit/lots/:id', () => {
  it('cadeia íntegra: lances em ordem de seq, encadeados e sem dados privados', async () => {
    const lot = await lotWithThreeBids();

    const res = await request(app).get(`/api/audit/lots/${lot.id}`);

    expect(res.status).toBe(200);
    expect(res.body.verdict).toEqual({ intact: true });
    expect(res.body.lot).toMatchObject({ id: lot.id, title: 'Obra', status: LotStatus.LIVE });
    expect(res.body.checkedAt).toEqual(expect.any(String));
    expect(res.body.bids.map((b: { seq: number }) => b.seq)).toEqual([1, 2, 3]);
    expect(res.body.bids[0].prevHash).toBe(GENESIS_HASH);
    expect(res.body.bids[1].prevHash).toBe(res.body.bids[0].hash);
    expect(Object.keys(res.body.bids[0]).sort()).toEqual(
      ['amount', 'createdAt', 'hash', 'prevHash', 'pseudonym', 'seq', 'valid'].sort(),
    );
    const json = JSON.stringify(res.body);
    const bidderIds = (await Bid.find({ lotId: lot._id }).lean()).map((bid) => bid.bidderId.toString());
    for (const forbidden of ['bidderId', 'leaderId', 'winnerId', 'auctioneerId', '@example.com', 'Usuário', ...bidderIds]) {
      expect(json).not.toContain(forbidden);
    }
  });

  it('lote sem lances com a cabeça íntegra é intacto; com a cabeça adulterada, head_mismatch sem seq', async () => {
    const lot = await insertLot(auctioneer.id);
    expect(await audit(lot.id)).toMatchObject({ bids: [], verdict: { intact: true } });

    await Lot.updateOne({ _id: lot.id }, { $set: { 'chainHead.signature': 'f'.repeat(64) } });
    expect((await audit(lot.id)).verdict).toEqual({ intact: false, problem: AuditProblem.HEAD_MISMATCH });
  });

  it('valor alterado num lance do meio → altered, só aquele lance inválido', async () => {
    const lot = await lotWithThreeBids();
    await Bid.updateOne({ lotId: lot.id, seq: 2 }, { $set: { amount: 9_999 } });

    const body = await audit(lot.id);

    expect(body.verdict).toEqual({ intact: false, firstInvalidSeq: 2, problem: AuditProblem.ALTERED });
    expect(validity(body)).toEqual([[1, true], [2, false], [3, true]]);
  });

  it('lance do meio apagado → missing, apontando o seq que sumiu', async () => {
    const lot = await lotWithThreeBids();
    await Bid.deleteOne({ lotId: lot.id, seq: 2 });

    const body = await audit(lot.id);

    expect(body.verdict).toEqual({ intact: false, firstInvalidSeq: 2, problem: AuditProblem.MISSING });
    expect(validity(body)).toEqual([[1, true], [3, false]]);
  });

  it('último lance apagado → head_mismatch no seq que a cabeça promete', async () => {
    const lot = await lotWithThreeBids();
    await Bid.deleteOne({ lotId: lot.id, seq: 3 });

    const body = await audit(lot.id);

    expect(body.verdict).toEqual({ intact: false, firstInvalidSeq: 3, problem: AuditProblem.HEAD_MISMATCH });
    expect(validity(body)).toEqual([[1, true], [2, true]]);
  });

  it('lance falso inserido no fim → inserted', async () => {
    const lot = await lotWithThreeBids();
    const last = (await bidOf(lot.id, 3))!;
    await Bid.create({ ...last, _id: undefined, seq: 4, amount: 5_000, prevHash: last.hash, hash: 'a'.repeat(64) });

    const body = await audit(lot.id);

    expect(body.verdict).toEqual({ intact: false, firstInvalidSeq: 4, problem: AuditProblem.INSERTED });
    expect(validity(body)).toEqual([[1, true], [2, true], [3, true], [4, false]]);
  });

  it('lance com seq repetido → inserted, e a cadeia original continua válida', async () => {
    const lot = await lotWithThreeBids();
    const second = (await bidOf(lot.id, 2))!;
    // O índice único (lotId, seq) impede o seq repetido; um atacante com acesso ao banco pode removê-lo.
    await Bid.collection.dropIndex('lotId_1_seq_1');
    await Bid.collection.insertOne({ ...second, _id: new Types.ObjectId(), amount: 1_150 });

    const body = await audit(lot.id);
    await Bid.deleteMany({});
    await Bid.syncIndexes();

    expect(body.verdict).toEqual({ intact: false, firstInvalidSeq: 2, problem: AuditProblem.INSERTED });
    expect(validity(body)).toEqual([[1, true], [2, true], [2, false], [3, true]]);
  });

  it('cabeça adulterada (contagem ou último hash) → head_mismatch', async () => {
    const lot = await lotWithThreeBids();
    await Lot.updateOne({ _id: lot.id }, { $set: { bidCount: 2 } });
    const shrunk = await audit(lot.id);
    // A assinatura não confere com bidCount 2: a contagem não é confiável, então o problema é a cabeça.
    expect(shrunk.verdict).toMatchObject({ intact: false, problem: AuditProblem.HEAD_MISMATCH });

    await Lot.updateOne({ _id: lot.id }, { $set: { bidCount: 3, 'chainHead.lastHash': 'b'.repeat(64) } });
    expect((await audit(lot.id)).verdict).toEqual({
      intact: false,
      firstInvalidSeq: 3,
      problem: AuditProblem.HEAD_MISMATCH,
    });
  });

  it('lote liquidado: íntegro, e result.chainHash ou result.amount adulterados → head_mismatch', async () => {
    const lot = await lotWithThreeBids();
    await Lot.updateOne({ _id: lot.id }, { $set: { endsAt: new Date(Date.now() - 1) } });
    await settleDueLots();
    expect((await audit(lot.id)).verdict).toEqual({ intact: true });

    await Lot.updateOne({ _id: lot.id }, { $set: { 'result.amount': 900 } });
    expect((await audit(lot.id)).verdict).toEqual({ intact: false, firstInvalidSeq: 3, problem: AuditProblem.HEAD_MISMATCH });

    await Lot.updateOne({ _id: lot.id }, { $set: { 'result.amount': 1_200, 'result.chainHash': 'c'.repeat(64) } });
    expect((await audit(lot.id)).verdict).toEqual({ intact: false, firstInvalidSeq: 3, problem: AuditProblem.HEAD_MISMATCH });
  });

  it('lote cancelado também é auditável; inexistente ou malformado → 404', async () => {
    const lot = await lotWithThreeBids();
    await request(app).post(`/api/lots/${lot.id}/cancel`).set('Authorization', `Bearer ${auctioneer.token}`);

    const body = await audit(lot.id);
    expect(body.lot.status).toBe(LotStatus.CANCELLED);
    expect(body.verdict).toEqual({ intact: true });

    for (const id of [new Types.ObjectId().toString(), 'nao-e-id']) {
      const res = await request(app).get(`/api/audit/lots/${id}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(ErrorCode.NOT_FOUND);
    }
  });
});

describe('auditoria: estado do lote preso à cadeia e dados adulterados', () => {
  async function settledLot() {
    const lot = await lotWithThreeBids();
    await Lot.updateOne({ _id: lot.id }, { $set: { endsAt: new Date(Date.now() - 1) } });
    await settleDueLots();
    return lot;
  }
  const headMismatch = { intact: false, firstInvalidSeq: 3, problem: AuditProblem.HEAD_MISMATCH };

  it('lote liquidado sem lances e íntegro continua intacto', async () => {
    const lot = await insertLot(auctioneer.id, { endsAt: new Date(Date.now() - 1) });
    await settleDueLots();
    expect((await audit(lot.id)).verdict).toEqual({ intact: true });
  });

  it('result zerado num lote liquidado com lances → head_mismatch', async () => {
    const lot = await settledLot();
    await Lot.updateOne(
      { _id: lot.id },
      { $set: { 'result.winnerId': null, 'result.winnerPseudonym': null, 'result.amount': null, 'result.receiptCode': null } },
    );
    expect((await audit(lot.id)).verdict).toEqual(headMismatch);
  });

  it('winnerId trocado para outro licitante → head_mismatch', async () => {
    // bruno não deu lance neste lote: é a conta que passaria a ver "won" e o comprovante.
    const lot = await settledLot();
    await Lot.updateOne({ _id: lot.id }, { $set: { 'result.winnerId': new Types.ObjectId(bruno.id) } });
    expect((await audit(lot.id)).verdict).toEqual(headMismatch);
  });

  it('winnerPseudonym trocado → head_mismatch', async () => {
    const lot = await settledLot();
    await Lot.updateOne({ _id: lot.id }, { $set: { 'result.winnerPseudonym': 'Licitante #000000' } });
    expect((await audit(lot.id)).verdict).toEqual(headMismatch);
  });

  it('leaderId trocado num lote ativo → head_mismatch', async () => {
    const lot = await lotWithThreeBids();
    await Lot.updateOne({ _id: lot.id }, { $set: { leaderId: new Types.ObjectId(bruno.id) } });
    expect((await audit(lot.id)).verdict).toEqual(headMismatch);
  });

  it('currentBid trocado num lote ativo → head_mismatch', async () => {
    const lot = await lotWithThreeBids();
    await Lot.updateOne({ _id: lot.id }, { $set: { currentBid: 1_100 } });
    expect((await audit(lot.id)).verdict).toEqual(headMismatch);
  });

  it('bidderId trocado num lance → altered, só aquele lance inválido e sem bidderId na resposta', async () => {
    const lot = await lotWithThreeBids();
    await Bid.updateOne({ lotId: lot.id, seq: 2 }, { $set: { bidderId: new Types.ObjectId(alice.id) } });

    const body = await audit(lot.id);

    expect(body.verdict).toEqual({ intact: false, firstInvalidSeq: 2, problem: AuditProblem.ALTERED });
    expect(validity(body)).toEqual([[1, true], [2, false], [3, true]]);
    expect(JSON.stringify(body)).not.toContain('bidderId');
  });

  it('createdAt gravado como texto ou amount como texto → altered, sem 500', async () => {
    const lot = await lotWithThreeBids();
    const second = (await bidOf(lot.id, 2))!;
    // Direto na coleção, sem o cast do Mongoose (como faria quem edita o banco).
    await Bid.collection.updateOne({ _id: second._id }, { $set: { createdAt: second.createdAt.toISOString() } });
    await Bid.collection.updateOne({ lotId: lot._id, seq: 3 }, { $set: { amount: '1200' } });

    const res = await request(app).get(`/api/audit/lots/${lot.id}`);

    expect(res.status).toBe(200);
    expect(res.body.verdict).toEqual({ intact: false, firstInvalidSeq: 2, problem: AuditProblem.ALTERED });
    expect(validity(res.body)).toEqual([[1, true], [2, false], [3, false]]);
  });

  it('chainHead removido → head_mismatch, sem 500', async () => {
    const lot = await lotWithThreeBids();
    await Lot.collection.updateOne({ _id: lot._id }, { $unset: { chainHead: '' } });

    const res = await request(app).get(`/api/audit/lots/${lot.id}`);

    expect(res.status).toBe(200);
    expect(res.body.verdict).toEqual(headMismatch);
  });

  it('lance forjado com seq 0 → inserted com firstInvalidSeq 0; a cadeia real segue válida', async () => {
    const lot = await lotWithThreeBids();
    const first = (await bidOf(lot.id, 1))!;
    // Direto na coleção: o schema do app recusa seq < 1, quem edita o banco não.
    await Bid.collection.insertOne({ ...first, _id: new Types.ObjectId(), seq: 0, amount: 50_000, hash: 'd'.repeat(64) });

    const body = await audit(lot.id);

    expect(body.verdict).toEqual({ intact: false, firstInvalidSeq: 0, problem: AuditProblem.INSERTED });
    expect(validity(body)).toEqual([[0, false], [1, true], [2, true], [3, true]]);
  });
});

describe('GET /api/me/bids', () => {
  const myBids = (user: TestUser) => request(app).get('/api/me/bids').set('Authorization', `Bearer ${user.token}`);

  it('os 5 status, o maior lance de cada lote e o comprovante só no won', async () => {
    const winning = await insertLot(auctioneer.id);
    const outbid = await insertLot(auctioneer.id);
    const won = await insertLot(auctioneer.id);
    const lost = await insertLot(auctioneer.id);
    const cancelled = await insertLot(auctioneer.id);

    await bidAs(app, alice, winning.id, 1_000);
    await bidAs(app, alice, outbid.id, 1_000);
    await bidAs(app, bruno, outbid.id, 1_100);
    await bidAs(app, alice, outbid.id, 1_200);
    await bidAs(app, bruno, outbid.id, 1_300);
    await bidAs(app, alice, won.id, 2_000);
    await bidAs(app, alice, lost.id, 1_000);
    await bidAs(app, bruno, lost.id, 1_500);
    await bidAs(app, alice, cancelled.id, 1_000);
    await request(app).post(`/api/lots/${cancelled.id}/cancel`).set('Authorization', `Bearer ${auctioneer.token}`);
    await Lot.updateMany({ _id: { $in: [won.id, lost.id] } }, { $set: { endsAt: new Date(Date.now() - 1) } });
    await settleDueLots();

    const res = await myBids(alice);

    expect(res.status).toBe(200);
    // Mais recente primeiro: ordem inversa dos últimos lances da Alice.
    expect(res.body.items.map((item: { lot: { id: string } }) => item.lot.id)).toEqual(
      [cancelled, lost, won, outbid, winning].map((lot) => lot.id),
    );
    const byLot = Object.fromEntries(res.body.items.map((item: { lot: { id: string } }) => [item.lot.id, item]));
    expect(byLot[winning.id]).toMatchObject({ myStatus: MyBidStatus.WINNING, myHighestBid: 1_000 });
    expect(byLot[outbid.id]).toMatchObject({ myStatus: MyBidStatus.OUTBID, myHighestBid: 1_200 });
    expect(byLot[won.id]).toMatchObject({ myStatus: MyBidStatus.WON, myHighestBid: 2_000 });
    expect(byLot[won.id].receiptCode).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(byLot[lost.id]).toMatchObject({ myStatus: MyBidStatus.LOST, myHighestBid: 1_000 });
    expect(byLot[cancelled.id]).toMatchObject({ myStatus: MyBidStatus.CANCELLED, myHighestBid: 1_000 });
    for (const lot of [winning, outbid, lost, cancelled]) expect(byLot[lot.id]).not.toHaveProperty('receiptCode');
    expect(byLot[winning.id].lot).toMatchObject({ title: 'Obra', status: LotStatus.LIVE });
  });

  it('o lote vencido ainda não liquidado continua winning para o líder', async () => {
    const lot = await insertLot(auctioneer.id);
    await bidAs(app, alice, lot.id, 1_000);
    await Lot.updateOne({ _id: lot.id }, { $set: { endsAt: new Date(Date.now() - 1) } });

    const [item] = (await myBids(alice)).body.items;

    expect(item).toMatchObject({ myStatus: MyBidStatus.WINNING, lot: { status: LotStatus.ENDED } });
  });

  it('sem lances: lista vazia; leiloeiro → 403', async () => {
    expect((await myBids(bruno)).body).toEqual({ items: [] });
    const res = await myBids(auctioneer);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ErrorCode.FORBIDDEN);
  });
});

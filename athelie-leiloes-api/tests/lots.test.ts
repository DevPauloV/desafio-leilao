import type { Express } from 'express';
import { Types } from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorCode, GENESIS_HASH, LOTS_PAGE_SIZE, LotPeriod, LotState, LotStatus, Role } from '../src/constants.js';
import { Image } from '../src/models/Image.js';
import { Lot } from '../src/models/Lot.js';
import { User } from '../src/models/User.js';
import { headSignature } from '../src/domain/audit-chain.js';
import {
  IMAGE_BYTES,
  TEST_AUDIT_SECRET,
  failingFetch,
  fakeMetFetch,
  insertLot as insertLotFor,
  metObject,
  registerUser,
  startTestApp,
} from './setup.js';

const MINUTE = 60_000;

let app: Express;
let stop: () => Promise<void>;
let auctioneer: { token: string; id: string };
let otherAuctioneer: { token: string; id: string };
let bidder: { token: string; id: string };

beforeAll(async () => {
  ({ app, stop } = await startTestApp());
  auctioneer = await registerUser(app, Role.AUCTIONEER);
  otherAuctioneer = await registerUser(app, Role.AUCTIONEER);
  bidder = await registerUser(app, Role.BIDDER);
}, 120_000);

afterAll(async () => {
  await stop?.();
});

beforeEach(async () => {
  await Promise.all([Lot.deleteMany({}), Image.deleteMany({})]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const fromNow = (ms: number) => new Date(Date.now() + ms);

function lotInput(overrides: Record<string, unknown> = {}) {
  return {
    metObjectId: 100,
    startingBid: 10_000,
    minIncrement: 500,
    startsAt: fromNow(MINUTE).toISOString(),
    endsAt: fromNow(60 * MINUTE).toISOString(),
    ...overrides,
  };
}

const createLot = (body: object, token = auctioneer.token) => request(app).post('/api/lots').set(auth(token)).send(body);

const insertLot = (overrides: Record<string, unknown> = {}) => insertLotFor(auctioneer.id, overrides);

const settledResult = (amount: number | null) => ({
  winnerId: amount === null ? null : new Types.ObjectId(),
  amount,
  chainHash: GENESIS_HASH,
  settledAt: new Date(),
});

describe('POST /api/lots', () => {
  it('copia a obra do Met, salva a imagem e responde o LotDetail', async () => {
    vi.stubGlobal('fetch', fakeMetFetch([metObject(100)]));

    const res = await createLot(lotInput());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Obra 100',
      artist: 'Artista Teste',
      status: LotStatus.SCHEDULED,
      startingBid: 10_000,
      minIncrement: 500,
      minimumNextBid: 10_000,
      currentBid: null,
      bidCount: 0,
      bids: [],
      item: {
        title: 'Obra 100',
        date: '1880',
        medium: 'Óleo sobre tela',
        department: 'European Paintings',
        metUrl: 'https://www.metmuseum.org/art/collection/search/100',
      },
    });
    expect(res.body.imageUrl).toMatch(/^\/api\/images\/[a-f\d]{24}$/);
    expect(res.body.item.imageUrl).toBe(res.body.imageUrl);
    expect(res.body).not.toHaveProperty('auctioneerId');

    const lot = await Lot.findById(res.body.id).lean();
    expect(lot?.chainHead).toEqual({
      lastHash: GENESIS_HASH,
      signature: headSignature(TEST_AUDIT_SECRET, res.body.id, 0, GENESIS_HASH),
    });
    expect(lot?.state).toBe(LotState.ACTIVE);
    const image = await Image.findById(lot?.item.imageId);
    expect(image?.contentType).toBe('image/jpeg');
    expect(Buffer.compare(image!.data, Buffer.from(IMAGE_BYTES))).toBe(0);
  });

  it('recusa obra fora do domínio público sem gravar nada', async () => {
    vi.stubGlobal('fetch', fakeMetFetch([metObject(100, { isPublicDomain: false })]));

    const res = await createLot(lotInput());

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(res.body.error.details.fields).toHaveProperty('metObjectId');
    expect(await Image.countDocuments()).toBe(0);
  });

  it('Met fora do ar → 503, sem lote nem imagem', async () => {
    vi.stubGlobal('fetch', failingFetch());

    const res = await createLot(lotInput());

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe(ErrorCode.EXTERNAL_API_UNAVAILABLE);
    expect(await Lot.countDocuments()).toBe(0);
    expect(await Image.countDocuments()).toBe(0);
  });

  it('licitante não cria lote (403)', async () => {
    const res = await createLot(lotInput(), bidder.token);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ErrorCode.FORBIDDEN);
  });

  it('valida datas e valores', async () => {
    const past = await createLot(lotInput({ startsAt: fromNow(-10 * MINUTE).toISOString() }));
    expect(past.status).toBe(400);
    expect(past.body.error.details.fields).toHaveProperty('startsAt');

    const backwards = await createLot(lotInput({ endsAt: fromNow(MINUTE / 2).toISOString() }));
    expect(backwards.body.error.details.fields).toHaveProperty('endsAt');

    const money = await createLot(lotInput({ startingBid: 10.5, minIncrement: 0 }));
    expect(Object.keys(money.body.error.details.fields).sort()).toEqual(['minIncrement', 'startingBid']);

    const notIso = await createLot(lotInput({ startsAt: 'amanhã' }));
    expect(notIso.body.error.details.fields).toHaveProperty('startsAt');
  });

  it('aceita início "agora" com alguns segundos de atraso', async () => {
    vi.stubGlobal('fetch', fakeMetFetch([metObject(100)]));
    const res = await createLot(lotInput({ startsAt: fromNow(-5_000).toISOString() }));
    expect(res.status).toBe(201);
    expect(res.body.status).toBe(LotStatus.LIVE);
  });
});

describe('GET /api/lots (vitrine)', () => {
  it('exclui cancelados e ordena: ao vivo pelo fim, agendados pelo início, encerrados pelo fim mais recente', async () => {
    const liveLate = await insertLot({ endsAt: fromNow(10 * MINUTE) });
    const liveSoon = await insertLot({ endsAt: fromNow(5 * MINUTE) });
    const scheduledLate = await insertLot({ startsAt: fromNow(120 * MINUTE), endsAt: fromNow(180 * MINUTE) });
    const scheduledSoon = await insertLot({ startsAt: fromNow(60 * MINUTE), endsAt: fromNow(180 * MINUTE) });
    const endedOld = await insertLot({ startsAt: fromNow(-120 * MINUTE), endsAt: fromNow(-60 * MINUTE) });
    const endedRecent = await insertLot({
      state: LotState.SETTLED,
      startsAt: fromNow(-120 * MINUTE),
      endsAt: fromNow(-10 * MINUTE),
      result: settledResult(null),
    });
    await insertLot({ state: LotState.CANCELLED });

    const res = await request(app).get('/api/lots');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(6);
    expect(res.body.page).toBe(1);
    expect(new Date(res.body.serverTime).getTime()).toBeGreaterThan(Date.now() - MINUTE);
    const ids = [liveSoon, liveLate, scheduledSoon, scheduledLate, endedRecent, endedOld].map((lot) => lot.id);
    expect(res.body.items.map((item: { id: string }) => item.id)).toEqual(ids);
    expect(res.body.items.map((item: { status: string }) => item.status)).toEqual([
      LotStatus.LIVE,
      LotStatus.LIVE,
      LotStatus.SCHEDULED,
      LotStatus.SCHEDULED,
      LotStatus.ENDED,
      LotStatus.ENDED,
    ]);
    expect(Object.keys(res.body.items[0]).sort()).toEqual(
      [
        'artist',
        'bidCount',
        'currentBid',
        'date',
        'department',
        'endsAt',
        'id',
        'imageUrl',
        'medium',
        'startingBid',
        'startsAt',
        'status',
        'title',
      ].sort(),
    );
  });

  it('filtra por status e pagina', async () => {
    await insertLot();
    await insertLot({ startsAt: fromNow(60 * MINUTE), endsAt: fromNow(120 * MINUTE) });
    for (let i = 0; i < LOTS_PAGE_SIZE; i++) await insertLot({ endsAt: fromNow((i + 2) * MINUTE) });

    const scheduled = await request(app).get('/api/lots').query({ status: LotStatus.SCHEDULED });
    expect(scheduled.body.total).toBe(1);
    expect(scheduled.body.items[0].status).toBe(LotStatus.SCHEDULED);

    const page2 = await request(app).get('/api/lots').query({ status: LotStatus.LIVE, page: 2 });
    expect(page2.body).toMatchObject({ page: 2, total: LOTS_PAGE_SIZE + 1 });
    expect(page2.body.items).toHaveLength(1);

    const cancelled = await request(app).get('/api/lots').query({ status: LotStatus.CANCELLED });
    expect(cancelled.status).toBe(400);
  });
});

describe('GET /api/lots: busca e filtro', () => {
  const EUROPEAN = 'European Paintings';
  const ASIAN = 'Asian Art';
  const ARMS = 'Arms and Armor';

  async function catalog() {
    return {
      degasLive: await insertLot({ item: { title: 'The Dance Class', artist: 'Edgar Degas', department: EUROPEAN } }),
      degasScheduled: await insertLot({
        item: { title: 'Dancers Practicing at the Barre', artist: 'Edgar Degas', department: EUROPEAN },
        startsAt: fromNow(60 * MINUTE),
        endsAt: fromNow(120 * MINUTE),
      }),
      vermeer: await insertLot({ item: { title: 'Young Woman with a Water Pitcher', artist: 'Johannes Vermeer', department: EUROPEAN } }),
      hokusai: await insertLot({ item: { title: 'The Great Wave', artist: 'Katsushika Hokusai', department: ASIAN } }),
      armor: await insertLot({ item: { title: 'Armor (1550)', artist: null, department: ARMS } }),
      cancelled: await insertLot({ item: { title: 'Statue of Yuny', department: 'Egyptian Art' }, state: LotState.CANCELLED }),
      noDepartment: await insertLot({ item: { title: 'Sem departamento' } }),
    };
  }
  const list = (query: Record<string, string | number>) => request(app).get('/api/lots').query(query);
  const ids = (res: request.Response) => res.body.items.map((item: { id: string }) => item.id).sort();

  it('q acha trecho no título ou no artista, sem diferenciar maiúsculas', async () => {
    const lots = await catalog();

    expect(ids(await list({ q: 'dega' }))).toEqual([lots.degasLive.id, lots.degasScheduled.id].sort());
    expect(ids(await list({ q: 'DEGAS' }))).toEqual([lots.degasLive.id, lots.degasScheduled.id].sort());
    expect(ids(await list({ q: 'pitcher' }))).toEqual([lots.vermeer.id]);
    expect((await list({ q: 'yuny' })).body.total).toBe(0); // cancelado nunca aparece
  });

  it('caractere especial de regex na busca é literal: não dá erro nem casa tudo', async () => {
    const lots = await catalog();

    const paren = await list({ q: '(' });
    expect(paren.status).toBe(200);
    expect(ids(paren)).toEqual([lots.armor.id]);
    const wildcard = await list({ q: '.*' });
    expect(wildcard.status).toBe(200);
    expect(wildcard.body.total).toBe(0);
  });

  it('department filtra por igualdade e combina com q, status e página', async () => {
    const lots = await catalog();

    expect(ids(await list({ department: ASIAN }))).toEqual([lots.hokusai.id]);
    const european = await list({ department: EUROPEAN });
    expect(european.body.total).toBe(3);
    expect((await list({ department: 'european' })).body.total).toBe(0); // igualdade exata

    const scheduledDegas = await list({ q: 'degas', status: LotStatus.SCHEDULED });
    expect(scheduledDegas.body).toMatchObject({ total: 1, items: [{ id: lots.degasScheduled.id }] });
    expect((await list({ q: 'degas', department: ASIAN })).body.total).toBe(0);

    const page2 = await list({ department: EUROPEAN, page: 2 });
    expect(page2.body).toMatchObject({ page: 2, total: 3, items: [] });
  });

  it('departments e artists contam os lotes da aba, em ordem alfabética, sem nulos e sem depender dos outros filtros', async () => {
    await catalog();

    const all = await list({});
    expect(all.body.departments).toEqual([
      { name: ARMS, count: 1 },
      { name: ASIAN, count: 1 },
      { name: EUROPEAN, count: 3 },
    ]);
    expect(all.body.artists).toEqual([
      { name: 'Edgar Degas', count: 2 },
      { name: 'Johannes Vermeer', count: 1 },
      { name: 'Katsushika Hokusai', count: 1 },
    ]);
    const filtered = await list({ q: 'hokusai', department: ASIAN });
    expect(filtered.body.departments).toEqual(all.body.departments);
    expect((await list({ status: LotStatus.SCHEDULED })).body.artists).toEqual([{ name: 'Edgar Degas', count: 1 }]);
  });

  it('artist filtra por igualdade exata', async () => {
    const lots = await catalog();

    expect(ids(await list({ artist: 'Edgar Degas', status: LotStatus.LIVE }))).toEqual([lots.degasLive.id]);
    expect((await list({ artist: 'degas' })).body.total).toBe(0);
  });

  it('minPrice e maxPrice usam o lance atual, ou o inicial quando não há lances', async () => {
    const cheap = await insertLot({ startingBid: 5_000 });
    const outbid = await insertLot({ startingBid: 5_000, currentBid: 20_000, bidCount: 2 });
    const pricey = await insertLot({ startingBid: 50_000 });

    expect(ids(await list({ maxPrice: 10_000 }))).toEqual([cheap.id]);
    expect(ids(await list({ minPrice: 10_000, maxPrice: 20_000 }))).toEqual([outbid.id]);
    expect(ids(await list({ minPrice: 20_000 }))).toEqual([outbid.id, pricey.id].sort());
  });

  it('period olha o fim (ao vivo), o início (agendado) ou o fim passado (encerrado)', async () => {
    const DAY = 24 * 60 * MINUTE;
    const endsSoon = await insertLot({ endsAt: fromNow(2 * 60 * MINUTE) });
    await insertLot({ endsAt: fromNow(3 * DAY) });
    const startsSoon = await insertLot({ startsAt: fromNow(60 * MINUTE), endsAt: fromNow(2 * DAY) });
    await insertLot({ startsAt: fromNow(10 * DAY), endsAt: fromNow(11 * DAY) });
    const endedRecently = await insertLot({ startsAt: fromNow(-2 * DAY), endsAt: fromNow(-60 * MINUTE) });
    await insertLot({ startsAt: fromNow(-12 * DAY), endsAt: fromNow(-10 * DAY) });

    expect(ids(await list({ period: LotPeriod.DAY, status: LotStatus.LIVE }))).toEqual([endsSoon.id]);
    expect(ids(await list({ period: LotPeriod.DAY, status: LotStatus.SCHEDULED }))).toEqual([startsSoon.id]);
    expect(ids(await list({ period: LotPeriod.WEEK, status: LotStatus.ENDED }))).toEqual([endedRecently.id]);
    expect(ids(await list({ period: LotPeriod.DAY }))).toEqual([endsSoon.id, startsSoon.id, endedRecently.id].sort());
  });

  it('valida q, department, artist, preço e período', async () => {
    const empty = await list({ q: '   ' });
    expect(empty.status).toBe(400);
    expect(empty.body.error.details.fields.q).toBe('Digite algo para buscar.');
    expect((await list({ q: 'x'.repeat(81) })).status).toBe(400);
    expect((await list({ q: 'x'.repeat(80) })).status).toBe(200);
    expect((await list({ department: 'x'.repeat(81) })).status).toBe(400);
    expect((await list({ artist: 'x'.repeat(81) })).status).toBe(400);
    expect((await list({ minPrice: -1 })).status).toBe(400);
    expect((await list({ minPrice: 'abc' })).status).toBe(400);
    expect((await list({ period: '1y' })).status).toBe(400);
    const inverted = await list({ minPrice: 2_000, maxPrice: 1_000 });
    expect(inverted.status).toBe(400);
    expect(inverted.body.error.details.fields.maxPrice).toBe('O valor máximo precisa ser maior ou igual ao mínimo.');
  });
});

describe('GET /api/lots/:id', () => {
  it('responde o detalhe e 404 para id inexistente ou malformado', async () => {
    const lot = await insertLot();

    const res = await request(app).get(`/api/lots/${lot.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: lot.id, status: LotStatus.LIVE, minimumNextBid: 1_000, bids: [] });
    expect(res.body).not.toHaveProperty('me');

    for (const id of [new Types.ObjectId().toString(), 'nao-e-id']) {
      const missing = await request(app).get(`/api/lots/${id}`);
      expect(missing.status).toBe(404);
      expect(missing.body.error.code).toBe(ErrorCode.NOT_FOUND);
    }
  });
});

describe('POST /api/lots/:id/cancel', () => {
  const cancel = (id: string, token = auctioneer.token) =>
    request(app).post(`/api/lots/${id}/cancel`).set(auth(token));

  it('o dono cancela lote sem lances; some da vitrine', async () => {
    const lot = await insertLot({ startsAt: fromNow(MINUTE), endsAt: fromNow(60 * MINUTE) });

    const res = await cancel(lot.id);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: lot.id, status: LotStatus.CANCELLED, refunded: false });
    expect((await request(app).get('/api/lots')).body.total).toBe(0);
    expect((await cancel(lot.id)).body.error.code).toBe(ErrorCode.LOT_CANCELLED);
  });

  it('lote de outro leiloeiro → 404; licitante → 403', async () => {
    const lot = await insertLot();

    const other = await cancel(lot.id, otherAuctioneer.token);
    expect(other.status).toBe(404);
    expect(other.body.error.code).toBe(ErrorCode.NOT_FOUND);
    expect((await cancel(lot.id, bidder.token)).status).toBe(403);
    expect((await Lot.findById(lot.id).lean())?.state).toBe(LotState.ACTIVE);
  });

  it('lote encerrado → LOT_ENDED', async () => {
    const lot = await insertLot({ startsAt: fromNow(-60 * MINUTE), endsAt: fromNow(-MINUTE) });

    const res = await cancel(lot.id);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.LOT_ENDED);
  });

  it('com lances, devolve o comprometido do líder na mesma transação', async () => {
    await User.updateOne({ _id: bidder.id }, { $set: { wallet: { balance: 20_000, committed: 5_000 } } });
    const lot = await insertLot({ bidCount: 1, currentBid: 5_000, leaderId: bidder.id });

    const res = await cancel(lot.id);

    expect(res.body).toEqual({ id: lot.id, status: LotStatus.CANCELLED, refunded: true });
    const wallet = (await User.findById(bidder.id).lean())?.wallet;
    expect(wallet).toEqual({ balance: 20_000, committed: 0 });
  });
});

describe('GET /api/me/lots', () => {
  it('lista os lotes do leiloeiro, inclusive cancelados, com resultado e total recebido', async () => {
    const sold = await insertLot({
      state: LotState.SETTLED,
      endsAt: fromNow(-MINUTE),
      startsAt: fromNow(-60 * MINUTE),
      result: settledResult(30_000),
    });
    const unsold = await insertLot({
      state: LotState.SETTLED,
      endsAt: fromNow(-MINUTE),
      startsAt: fromNow(-60 * MINUTE),
      result: settledResult(null),
    });
    const cancelled = await insertLot({ state: LotState.CANCELLED });
    await insertLot({ auctioneerId: otherAuctioneer.id });

    const res = await request(app).get('/api/me/lots').set(auth(auctioneer.token));

    expect(res.status).toBe(200);
    expect(res.body.totalReceived).toBe(30_000);
    expect(res.body.serverTime).toBeTruthy();
    const byId = Object.fromEntries(res.body.items.map((item: { id: string }) => [item.id, item]));
    expect(Object.keys(byId).sort()).toEqual([sold.id, unsold.id, cancelled.id].sort());
    expect(byId[sold.id].result).toEqual({ sold: true, amount: 30_000 });
    expect(byId[unsold.id].result).toEqual({ sold: false, amount: null });
    expect(byId[cancelled.id]).toMatchObject({ status: LotStatus.CANCELLED, result: null });

    expect((await request(app).get('/api/me/lots').set(auth(bidder.token))).status).toBe(403);
  });
});

describe('GET /api/images/:id', () => {
  it('serve os bytes com tipo, cache imutável e CORP cross-origin', async () => {
    const lot = await insertLot();

    const res = await request(app).get(`/api/images/${lot.item.imageId.toString()}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(Buffer.compare(res.body as Buffer, Buffer.from(IMAGE_BYTES))).toBe(0);

    expect((await request(app).get(`/api/images/${new Types.ObjectId().toString()}`)).status).toBe(404);
    expect((await request(app).get('/api/images/xyz')).status).toBe(404);
  });
});

describe('Met fora do ar', () => {
  it('vitrine, detalhe e imagem continuam respondendo sem chamar o Met', async () => {
    vi.stubGlobal('fetch', fakeMetFetch([metObject(100)]));
    const created = await createLot(lotInput());
    expect(created.status).toBe(201);

    const fetchMock = failingFetch();
    vi.stubGlobal('fetch', fetchMock);

    expect((await request(app).get('/api/lots')).status).toBe(200);
    expect((await request(app).get(`/api/lots/${created.body.id}`)).status).toBe(200);
    const image = await request(app).get(created.body.imageUrl);
    expect(image.status).toBe(200);
    expect(image.headers['content-type']).toBe('image/jpeg');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

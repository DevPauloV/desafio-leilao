import type { Express } from 'express';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as connectClient, type Socket } from 'socket.io-client';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ErrorCode, Role, SocketEvent } from '../src/constants.js';
import { Bid } from '../src/models/Bid.js';
import { Image } from '../src/models/Image.js';
import { Lot } from '../src/models/Lot.js';
import { User } from '../src/models/User.js';
import { bidAs, depositFor, insertLot, registerUser, startTestApp, type TestUser } from './setup.js';

const EVENT_TIMEOUT_MS = 3_000;
/** Tempo para um evento que não deveria chegar ter tido a chance de chegar. */
const SETTLE_MS = 300;

let app: Express;
let stop: () => Promise<void>;
let httpServer: HttpServer;
let closeSocket: () => Promise<void>;
let settleDueLots: (now?: Date) => Promise<number>;
let url: string;
let auctioneer: TestUser;
let alice: TestUser;
let bruno: TestUser;
const clients: Socket[] = [];

beforeAll(async () => {
  ({ app, stop } = await startTestApp());
  const { attachSocket } = await import('../src/realtime/socket.js');
  ({ settleDueLots } = await import('../src/jobs/settlement.js'));
  httpServer = createServer(app);
  const io = await attachSocket(httpServer);
  closeSocket = () => new Promise((resolve) => void io.close(() => resolve()));
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
  auctioneer = await registerUser(app, Role.AUCTIONEER);
  alice = await registerUser(app, Role.BIDDER);
  bruno = await registerUser(app, Role.BIDDER);
}, 120_000);

afterAll(async () => {
  await closeSocket?.();
  await stop?.();
});

beforeEach(async () => {
  await Promise.all([Lot.deleteMany({}), Bid.deleteMany({}), Image.deleteMany({})]);
  await User.updateMany({}, { $set: { wallet: { balance: 0, committed: 0 } } });
  await depositFor(app, alice, 50_000);
  await depositFor(app, bruno, 50_000);
});

afterEach(() => {
  for (const client of clients.splice(0)) client.disconnect();
});

async function connect(token?: string): Promise<Socket> {
  const socket = connectClient(url, { auth: token ? { token } : {}, transports: ['websocket'], forceNew: true });
  clients.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  return socket;
}

function nextEvent<T = Record<string, unknown>>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`sem ${event} em ${EVENT_TIMEOUT_MS} ms`)), EVENT_TIMEOUT_MS);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function record(socket: Socket): string[] {
  const events: string[] = [];
  socket.onAny((event: string) => events.push(event));
  return events;
}

async function join(socket: Socket, lotId: unknown) {
  return socket.emitWithAck(SocketEvent.LOT_JOIN, { lotId });
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('lot:join', () => {
  it('responde lot:state com o LotDetail personalizado e entra na sala', async () => {
    const lot = await insertLot(auctioneer.id);
    const socket = await connect(alice.token);

    const statePromise = nextEvent<{ id: string; me: { pseudonym: string } }>(socket, SocketEvent.LOT_STATE);
    expect(await join(socket, lot.id)).toEqual({ ok: true });
    const state = await statePromise;

    expect(state.id).toBe(lot.id);
    expect(state.me.pseudonym).toMatch(/^Licitante #/);
  });

  it('lotId inválido ou inexistente responde NOT_FOUND no ack e o socket segue funcionando', async () => {
    const lot = await insertLot(auctioneer.id);
    const socket = await connect();

    for (const lotId of ['nao-e-id', 42, undefined, '0123456789abcdef01234567']) {
      expect(await join(socket, lotId)).toMatchObject({ error: { code: ErrorCode.NOT_FOUND } });
    }
    expect(await socket.emitWithAck(SocketEvent.LOT_JOIN, 'lixo')).toMatchObject({ error: { code: ErrorCode.NOT_FOUND } });

    expect(socket.connected).toBe(true);
    expect(await join(socket, lot.id)).toEqual({ ok: true });
  });

  it('token inválido conta como visitante: entra na sala, sem "me"', async () => {
    const lot = await insertLot(auctioneer.id);
    const socket = await connect('token.invalido.mesmo');

    const statePromise = nextEvent(socket, SocketEvent.LOT_STATE);
    await join(socket, lot.id);

    expect(await statePromise).not.toHaveProperty('me');
  });
});

describe('eventos do lance', () => {
  it('bid:new vai para a sala; bid:outbid e wallet:update só para o líder anterior; visitante não recebe nada pessoal', async () => {
    const lot = await insertLot(auctioneer.id);
    const [aliceSocket, brunoSocket, visitor] = await Promise.all([
      connect(alice.token),
      connect(bruno.token),
      connect(),
    ]);
    for (const socket of [aliceSocket, brunoSocket, visitor]) await join(socket, lot.id);
    const aliceEvents = record(aliceSocket);
    const brunoEvents = record(brunoSocket);
    const visitorEvents = record(visitor);

    const firstBid = nextEvent<Record<string, unknown>>(visitor, SocketEvent.BID_NEW);
    // Com o adapter, cada aviso passa pelo MongoDB: espera o da própria Alice antes de ouvir o próximo.
    const ownWallet = nextEvent(aliceSocket, SocketEvent.WALLET_UPDATE);
    await bidAs(app, alice, lot.id, 1_000);
    expect(await ownWallet).toMatchObject({ committed: 1_000 });
    expect(await firstBid).toMatchObject({
      lotId: lot.id,
      bid: { seq: 1, amount: 1_000 },
      currentBid: 1_000,
      minimumNextBid: 1_100,
      bidCount: 1,
      serverTime: expect.any(String),
    });

    const outbid = nextEvent(aliceSocket, SocketEvent.BID_OUTBID);
    const aliceWallet = nextEvent(aliceSocket, SocketEvent.WALLET_UPDATE);
    await bidAs(app, bruno, lot.id, 1_100);
    expect(await outbid).toEqual({ lotId: lot.id, title: 'Obra', currentBid: 1_100 });
    expect(await aliceWallet).toMatchObject({ committed: 0, available: 50_000 });

    await pause(SETTLE_MS);
    expect(brunoEvents).not.toContain(SocketEvent.BID_OUTBID);
    expect(brunoEvents).toContain(SocketEvent.WALLET_UPDATE);
    expect(visitorEvents).toEqual([SocketEvent.BID_NEW, SocketEvent.BID_NEW]);
    expect(aliceEvents.filter((event) => event === SocketEvent.BID_NEW)).toHaveLength(2);
  });

  it('lot:extended quando o lance prorroga o fim', async () => {
    const lot = await insertLot(auctioneer.id, { endsAt: new Date(Date.now() + 30_000) });
    const visitor = await connect();
    await join(visitor, lot.id);

    const extended = nextEvent<{ lotId: string; endsAt: string }>(visitor, SocketEvent.LOT_EXTENDED);
    const res = await bidAs(app, alice, lot.id, 1_000);

    expect(await extended).toMatchObject({ lotId: lot.id, endsAt: res.body.endsAt, serverTime: expect.any(String) });
  });

  it('lot:leave tira o socket da sala', async () => {
    const lot = await insertLot(auctioneer.id);
    const visitor = await connect();
    await join(visitor, lot.id);
    visitor.emit(SocketEvent.LOT_LEAVE, { lotId: lot.id });
    await pause(SETTLE_MS);
    const events = record(visitor);

    await bidAs(app, alice, lot.id, 1_000);
    await pause(SETTLE_MS);

    expect(events).toEqual([]);
  });
});

describe('eventos de cancelamento e liquidação', () => {
  it('lot:cancelled na sala e wallet:update para o líder estornado', async () => {
    const lot = await insertLot(auctioneer.id);
    await bidAs(app, alice, lot.id, 1_000);
    const [aliceSocket, visitor] = await Promise.all([connect(alice.token), connect()]);
    await join(visitor, lot.id);

    const cancelled = nextEvent(visitor, SocketEvent.LOT_CANCELLED);
    const wallet = nextEvent(aliceSocket, SocketEvent.WALLET_UPDATE);
    await request(app).post(`/api/lots/${lot.id}/cancel`).set('Authorization', `Bearer ${auctioneer.token}`);

    expect(await cancelled).toEqual({ lotId: lot.id });
    expect(await wallet).toMatchObject({ committed: 0, leading: [] });
  });

  it('lot:ended com pseudônimo e valor (sem ids) e wallet:update para o vencedor', async () => {
    const lot = await insertLot(auctioneer.id);
    const res = await bidAs(app, bruno, lot.id, 1_000);
    const [brunoSocket, visitor] = await Promise.all([connect(bruno.token), connect()]);
    await join(visitor, lot.id);
    await Lot.updateOne({ _id: lot.id }, { $set: { endsAt: new Date(Date.now() - 1) } });

    const ended = nextEvent(visitor, SocketEvent.LOT_ENDED);
    const wallet = nextEvent(brunoSocket, SocketEvent.WALLET_UPDATE);
    await settleDueLots();

    expect(await ended).toEqual({ lotId: lot.id, winnerPseudonym: res.body.bid.pseudonym, amount: 1_000 });
    expect(await wallet).toMatchObject({ balance: 49_000, committed: 0 });
  });
});

describe('aviso ao leiloeiro', () => {
  it('lot:ended chega na sala pessoal do leiloeiro dono, sem ele entrar na sala do lote', async () => {
    const lot = await insertLot(auctioneer.id);
    const res = await bidAs(app, alice, lot.id, 1_000);
    const auctioneerSocket = await connect(auctioneer.token);
    const otherAuctioneer = await connect((await registerUser(app, Role.AUCTIONEER)).token);
    const otherEvents = record(otherAuctioneer);
    await Lot.updateOne({ _id: lot.id }, { $set: { endsAt: new Date(Date.now() - 1) } });

    const ended = nextEvent(auctioneerSocket, SocketEvent.LOT_ENDED);
    await settleDueLots();

    expect(await ended).toEqual({ lotId: lot.id, winnerPseudonym: res.body.bid.pseudonym, amount: 1_000 });
    await pause(SETTLE_MS);
    expect(otherEvents).toEqual([]);
  });
});

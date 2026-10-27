// Infra comum dos testes de integração: Mongo em replica set (transações), app e um Met falso.
import type { Express } from 'express';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose, { Types } from 'mongoose';
import request from 'supertest';
import { vi } from 'vitest';
import { GENESIS_HASH, type Role } from '../src/constants.js';
import { headSignature } from '../src/domain/audit-chain.js';
import { Image } from '../src/models/Image.js';
import { Lot } from '../src/models/Lot.js';

export const CORS_ORIGINS = ['http://localhost:8080', 'http://localhost:5173'];
export const TEST_AUDIT_SECRET = 'segredo-de-teste-auditoria-0123';
const MINUTE = 60_000;

export async function startTestApp(): Promise<{ app: Express; stop: () => Promise<void> }> {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  // O env é validado no import, então precisa existir antes de importar o app.
  Object.assign(process.env, {
    MONGO_URI: replSet.getUri(),
    JWT_SECRET: 'segredo-de-teste-jwt-0123456789',
    AUDIT_SECRET: TEST_AUDIT_SECRET,
    CORS_ORIGIN: CORS_ORIGINS.join(', '),
  });
  const { createApp } = await import('../src/app.js');
  await mongoose.connect(replSet.getUri());
  // Índices (e-mail único etc.) prontos antes do primeiro teste.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  return {
    app: createApp(),
    stop: async () => {
      await mongoose.disconnect();
      await replSet.stop();
    },
  };
}

let userCount = 0;

export async function registerUser(app: Express, role: Role): Promise<{ token: string; id: string }> {
  userCount += 1;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: `Usuário ${userCount}`, email: `user${userCount}@example.com`, password: 'senha-forte-123', role });
  return { token: res.body.token, id: res.body.user.id };
}

/**
 * Lote gravado direto no banco (sem o Met), para montar estados que a API não produz direto:
 * ao vivo desde já, encerrado, liquidado. Por padrão, ao vivo há 1 minuto e por mais 60 (longe do anti-sniping).
 */
export async function insertLot(
  auctioneerId: string,
  { item, ...overrides }: Record<string, unknown> & { item?: Record<string, unknown> } = {},
) {
  const image = await Image.create({ data: Buffer.from(IMAGE_BYTES), contentType: 'image/jpeg' });
  const _id = new Types.ObjectId();
  return Lot.create({
    _id,
    auctioneerId,
    // Cabeça vazia assinada, como a API grava na criação.
    chainHead: { lastHash: GENESIS_HASH, signature: headSignature(TEST_AUDIT_SECRET, _id.toString(), 0, GENESIS_HASH) },
    item: { metObjectId: 1, title: 'Obra', imageId: image._id, ...item },
    startingBid: 1_000,
    minIncrement: 100,
    startsAt: new Date(Date.now() - MINUTE),
    endsAt: new Date(Date.now() + 60 * MINUTE),
    ...overrides,
  });
}

// ---- Met falso ----

export const IMAGE_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

/** Obra como o Met devolve em /objects/:id; por padrão, utilizável num lote. */
export function metObject(id: number, overrides: Record<string, unknown> = {}) {
  return {
    objectID: id,
    isPublicDomain: true,
    primaryImageSmall: `https://images.metmuseum.org/CRDImages/ep/web-large/${id}.jpg`,
    title: `Obra ${id}`,
    artistDisplayName: 'Artista Teste',
    objectDate: '1880',
    medium: 'Óleo sobre tela',
    department: 'European Paintings',
    objectURL: `https://www.metmuseum.org/art/collection/search/${id}`,
    ...overrides,
  };
}

/** `fetch` que responde como o Met: busca, detalhes das obras dadas e a imagem. */
export function fakeMetFetch(objects: { objectID: number }[]) {
  return vi.fn(async (input: string | URL | Request): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.pathname.endsWith('/search')) {
      return Response.json({ total: objects.length, objectIDs: objects.map((o) => o.objectID) });
    }
    const id = /\/objects\/(\d+)$/.exec(url.pathname)?.[1];
    const object = objects.find((o) => o.objectID === Number(id));
    if (object) return Response.json(object);
    if (url.hostname === 'images.metmuseum.org') {
      return new Response(IMAGE_BYTES, { headers: { 'content-type': 'image/jpeg' } });
    }
    return Response.json({ message: 'ObjectID not found' }, { status: 404 });
  });
}

/** `fetch` de um Met fora do ar. */
export function failingFetch() {
  return vi.fn(async (): Promise<Response> => {
    throw new TypeError('fetch failed');
  });
}

// ---- Atalhos de carteira e lance ----

export type TestUser = { token: string; id: string };

export const depositFor = (app: Express, user: TestUser, amount: number) =>
  request(app).post('/api/wallet/deposit').set('Authorization', `Bearer ${user.token}`).send({ amount });

export const bidAs = (app: Express, user: TestUser, lotId: string, amount: number) =>
  request(app).post(`/api/lots/${lotId}/bids`).set('Authorization', `Bearer ${user.token}`).send({ amount });

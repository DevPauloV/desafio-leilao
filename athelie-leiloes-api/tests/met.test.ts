import type { Express } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ERRORS, ErrorCode, MET_RETRIES, Role } from '../src/constants.js';
import { failingFetch, fakeMetFetch, metObject, registerUser, startTestApp } from './setup.js';

let app: Express;
let stop: () => Promise<void>;
let auctioneerToken: string;
let bidderToken: string;

beforeAll(async () => {
  ({ app, stop } = await startTestApp());
  auctioneerToken = (await registerUser(app, Role.AUCTIONEER)).token;
  bidderToken = (await registerUser(app, Role.BIDDER)).token;
}, 120_000);

afterAll(async () => {
  await stop?.();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const search = (q: string, token = auctioneerToken) =>
  request(app).get('/api/met/search').query({ q }).set('Authorization', `Bearer ${token}`);

describe('GET /api/met/search', () => {
  it('devolve só obras de domínio público com imagem do Met', async () => {
    vi.stubGlobal(
      'fetch',
      fakeMetFetch([
        metObject(1),
        metObject(2, { isPublicDomain: false }),
        metObject(3, { primaryImageSmall: '' }),
        metObject(4, { primaryImageSmall: 'https://evil.example/x.jpg' }),
        metObject(5, { title: '' }),
        metObject(6, { artistDisplayName: '', objectDate: '' }),
      ]),
    );

    const res = await search('monet');

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([
      {
        metObjectId: 1,
        title: 'Obra 1',
        artist: 'Artista Teste',
        date: '1880',
        medium: 'Óleo sobre tela',
        department: 'European Paintings',
        metUrl: 'https://www.metmuseum.org/art/collection/search/1',
        previewUrl: 'https://images.metmuseum.org/CRDImages/ep/web-large/1.jpg',
      },
      expect.objectContaining({ metObjectId: 6, artist: null, date: null }),
    ]);
  });

  it('usa a busca v1.1 do Met, com limite, e manda User-Agent', async () => {
    const fetchMock = fakeMetFetch([]);
    vi.stubGlobal('fetch', fetchMock);

    await search('monet');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.pathname).toMatch(/\/v1\.1\/search$/);
    expect(url.searchParams.get('hasImages')).toBe('true');
    expect(url.searchParams.get('limit')).toBeTruthy();
    expect(init.headers).toHaveProperty('User-Agent');
  });

  it('Met fora do ar → 503 EXTERNAL_API_UNAVAILABLE, depois de tentar de novo', async () => {
    const fetchMock = failingFetch();
    vi.stubGlobal('fetch', fetchMock);

    const res = await search('monet');

    expect(res.status).toBe(503);
    expect(res.body.error).toEqual({
      code: ErrorCode.EXTERNAL_API_UNAVAILABLE,
      message: ERRORS.EXTERNAL_API_UNAVAILABLE.message,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1 + MET_RETRIES);
  });

  it('obra que falha no meio é descartada e a busca devolve as outras', async () => {
    const met = fakeMetFetch([metObject(1), metObject(2), metObject(3)]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        if (String(input).endsWith('/objects/2')) return new Response('erro', { status: 500 });
        return met(input);
      }),
    );

    const res = await search('monet');

    expect(res.status).toBe(200);
    expect(res.body.items.map((item: { metObjectId: number }) => item.metObjectId)).toEqual([1, 3]);
  });

  it('busca responde, mas todas as obras falham → 503', async () => {
    const met = fakeMetFetch([metObject(1), metObject(2)]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        if (String(input).includes('/objects/')) throw new TypeError('fetch failed');
        return met(input);
      }),
    );

    const res = await search('monet');

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe(ErrorCode.EXTERNAL_API_UNAVAILABLE);
  });

  it('obras todas inválidas (sem falha do Met) → 200 com lista vazia', async () => {
    vi.stubGlobal('fetch', fakeMetFetch([metObject(1, { isPublicDomain: false })]));

    const res = await search('monet');

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('Met respondendo 5xx também vira 503', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('erro', { status: 502 })),
    );
    const res = await search('monet');
    expect(res.status).toBe(503);
  });

  it('licitante não busca (403) e q vazio é VALIDATION_ERROR', async () => {
    vi.stubGlobal('fetch', fakeMetFetch([]));

    expect((await search('monet', bidderToken)).status).toBe(403);
    const empty = await search('  ');
    expect(empty.status).toBe(400);
    expect(empty.body.error.details.fields).toHaveProperty('q');
  });
});

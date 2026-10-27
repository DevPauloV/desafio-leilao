import type { Express, NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ErrorCode, LOGIN_RATE_LIMIT_MAX, Role } from '../src/constants.js';
import { User } from '../src/models/User.js';
import { CORS_ORIGINS, startTestApp } from './setup.js';

const alice = { name: 'Alice Teste', email: 'Alice@Example.com', password: 'senha-forte-123', role: Role.BIDDER };

let app: Express;
let stop: () => Promise<void>;

beforeAll(async () => {
  ({ app, stop } = await startTestApp());
}, 120_000);

afterAll(async () => {
  await stop?.();
});

beforeEach(async () => {
  await User.deleteMany({});
});

function expectNoPasswordHash(body: unknown) {
  const json = JSON.stringify(body);
  expect(json).not.toContain('passwordHash');
  expect(json).not.toMatch(/\$2[aby]\$/);
}

const register = (data: object = alice) => request(app).post('/api/auth/register').send(data);
const login = (email: string, password: string) => request(app).post('/api/auth/login').send({ email, password });

describe('GET /health', () => {
  it('responde ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('POST /api/auth/register', () => {
  it('cria o usuário e devolve token e dados públicos', async () => {
    const res = await register();

    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toEqual({
      id: expect.any(String),
      name: alice.name,
      email: 'alice@example.com',
      role: Role.BIDDER,
    });
    expectNoPasswordHash(res.body);

    const stored = await User.findOne({ email: 'alice@example.com' }).select('+passwordHash').lean();
    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(stored?.wallet).toEqual({ balance: 0, committed: 0 });
  });

  it('recusa e-mail já cadastrado, sem diferenciar maiúsculas', async () => {
    await register();
    const res = await register({ ...alice, email: 'ALICE@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.EMAIL_TAKEN);
  });

  it('devolve VALIDATION_ERROR com a mensagem de cada campo', async () => {
    const res = await register({ name: 'A', email: 'nao-e-email', password: '123', role: 'admin' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Dados inválidos.',
        details: {
          fields: {
            name: 'O nome precisa ter pelo menos 2 caracteres.',
            email: 'Informe um e-mail válido.',
            password: 'A senha precisa ter pelo menos 8 caracteres.',
            role: expect.any(String),
          },
        },
      },
    });
  });

  it('recusa senha acima de 72 bytes', async () => {
    const res = await register({ ...alice, password: 'é'.repeat(37) }); // 37 caracteres, 74 bytes

    expect(res.status).toBe(400);
    expect(res.body.error.details.fields).toHaveProperty('password');
  });

  it('JSON malformado vira VALIDATION_ERROR sem details', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"name":');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: ErrorCode.VALIDATION_ERROR, message: 'Dados inválidos.' } });
  });
});

describe('POST /api/auth/login e GET /api/auth/me', () => {
  it('login certo devolve token que funciona no /me', async () => {
    await register();
    const res = await login('alice@example.com', alice.password);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('alice@example.com');
    expectNoPasswordHash(res.body);

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user).toEqual(res.body.user);
    expectNoPasswordHash(me.body);
  });

  it('senha errada e e-mail inexistente têm a mesma resposta', async () => {
    await register();
    const wrongPassword = await login(alice.email, 'senha-errada-999');
    const unknownEmail = await login('ninguem@example.com', alice.password);

    for (const res of [wrongPassword, unknownEmail]) {
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
    }
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it('/me sem token ou com token inválido devolve UNAUTHENTICATED', async () => {
    const noToken = await request(app).get('/api/auth/me');
    const badToken = await request(app).get('/api/auth/me').set('Authorization', 'Bearer abc.def.ghi');

    for (const res of [noToken, badToken]) {
      expect(res.status).toBe(401);
      expect(res.body.error).toEqual({ code: ErrorCode.UNAUTHENTICATED, message: 'Faça login para continuar.' });
    }
  });
});

describe('infraestrutura HTTP', () => {
  it('rota inexistente devolve NOT_FOUND', async () => {
    const res = await request(app).get('/api/nao-existe');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ErrorCode.NOT_FOUND);
  });

  it('CORS só libera as origens da lista', async () => {
    for (const origin of CORS_ORIGINS) {
      const allowed = await request(app).get('/health').set('Origin', origin);
      expect(allowed.headers['access-control-allow-origin']).toBe(origin);
    }
    const other = await request(app).get('/health').set('Origin', 'http://evil.example');
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('requireRole recusa papel errado com FORBIDDEN', async () => {
    const { requireRole } = await import('../src/middlewares/auth.js');
    const req = { auth: { id: 'x', role: Role.AUCTIONEER } } as Request;
    const next: NextFunction = () => undefined;

    expect(() => requireRole(Role.BIDDER)(req, {} as Response, next)).toThrow(
      expect.objectContaining({ code: ErrorCode.FORBIDDEN }),
    );
  });
});

// Por último: o limitador é por IP e guarda estado entre os testes.
describe('rate limit do login', () => {
  it(`bloqueia com RATE_LIMITED em até ${LOGIN_RATE_LIMIT_MAX + 1} tentativas`, async () => {
    let res = await login(alice.email, 'x');
    for (let attempt = 1; res.status !== 429 && attempt <= LOGIN_RATE_LIMIT_MAX; attempt++) {
      res = await login(alice.email, 'x');
    }

    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      error: { code: ErrorCode.RATE_LIMITED, message: 'Muitas tentativas. Aguarde um pouco.' },
    });
  });
});

import type { RequestHandler } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { ErrorCode, Role } from '../constants.js';
import { AppError } from '../errors.js';

export type AuthUser = { id: string; role: Role };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- única forma de estender o Request do Express
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

const ALGORITHM = 'HS256';
const tokenPayload = z.object({ sub: z.string().min(1), role: z.enum(Role) });

export function signToken(user: AuthUser): string {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    algorithm: ALGORITHM,
    // O env já valida o formato aceito pelo jsonwebtoken.
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

/** Usuário do header `Authorization: Bearer <jwt>`; `null` se ausente, inválido ou expirado. */
function readToken(header: string | undefined): AuthUser | null {
  const token = header && /^Bearer (\S+)$/.exec(header)?.[1];
  return token ? verifyToken(token) : null;
}

/** Usuário de um JWT (também usado no handshake do socket); `null` se inválido ou expirado. */
export function verifyToken(token: string): AuthUser | null {
  try {
    const payload = tokenPayload.parse(jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] }));
    return { id: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const user = readToken(req.headers.authorization);
  if (!user) throw new AppError(ErrorCode.UNAUTHENTICATED);
  req.auth = user;
  next();
};

/** Para rotas públicas que personalizam a resposta: token ausente ou inválido = visitante anônimo. */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const user = readToken(req.headers.authorization);
  if (user) req.auth = user;
  next();
};

/** Usar depois de `requireAuth`. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) throw new AppError(ErrorCode.UNAUTHENTICATED);
    if (!roles.includes(req.auth.role)) throw new AppError(ErrorCode.FORBIDDEN);
    next();
  };
}

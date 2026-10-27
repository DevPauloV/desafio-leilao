// Só transmite avisos; o lance vai pela REST (ADR 0006).
import type { Server as HttpServer } from 'node:http';
import { createAdapter } from '@socket.io/mongo-adapter';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { z } from 'zod';
import { env } from '../config/env.js';
import { ErrorCode, SOCKET_ADAPTER_COLLECTION, SOCKET_ADAPTER_TTL_SECONDS, SocketEvent } from '../constants.js';
import { AppError, errorBodyOf } from '../errors.js';
import { verifyToken } from '../middlewares/auth.js';
import { objectId } from '../middlewares/validate.js';
import { getLot } from '../services/lots.js';

const lotRoom = (lotId: string) => `lot:${lotId}`;
const userRoom = (userId: string) => `user:${userId}`;

const handshakeAuth = z.object({ token: z.string().optional() }).catch({});
const lotPayload = z.object({ lotId: objectId });

let io: Server | null = null;

/** Chamar depois do `mongoose.connect`: o adapter leva os avisos às outras instâncias pelo MongoDB. */
export async function attachSocket(httpServer: HttpServer): Promise<Server> {
  const db = mongoose.connection.db;
  if (!db) throw new Error('attachSocket chamado antes do mongoose.connect');
  const events = db.collection(SOCKET_ADAPTER_COLLECTION);
  await events.createIndex({ createdAt: 1 }, { expireAfterSeconds: SOCKET_ADAPTER_TTL_SECONDS });
  io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN },
    adapter: createAdapter(events, { addCreatedAtField: true }),
  });

  io.on('connection', (socket) => {
    // Token ausente ou inválido: o cliente só assiste (sem sala pessoal).
    const { token } = handshakeAuth.parse(socket.handshake.auth);
    const user = token ? verifyToken(token) : null;
    if (user) void socket.join(userRoom(user.id));

    // `ack` é opcional: com ele, o cliente recebe `{ ok: true }` ou o erro no formato padrão.
    socket.on(SocketEvent.LOT_JOIN, async (payload: unknown, ack?: unknown) => {
      const reply = typeof ack === 'function' ? (ack as (response: unknown) => void) : () => undefined;
      try {
        const parsed = lotPayload.safeParse(payload);
        if (!parsed.success) throw new AppError(ErrorCode.NOT_FOUND);
        const state = await getLot(parsed.data.lotId, user ?? undefined);
        await socket.join(lotRoom(parsed.data.lotId));
        socket.emit(SocketEvent.LOT_STATE, state);
        reply({ ok: true });
      } catch (err) {
        if (!(err instanceof AppError)) console.error('[socket] falha no lot:join:', err instanceof Error ? err.message : err);
        reply(errorBodyOf(err));
      }
    });

    socket.on(SocketEvent.LOT_LEAVE, (payload: unknown) => {
      const parsed = lotPayload.safeParse(payload);
      if (parsed.success) void socket.leave(lotRoom(parsed.data.lotId));
    });
  });

  return io;
}

/** Sem socket ligado (testes só de HTTP, scripts), os avisos simplesmente não saem. */
export function emitToLot(lotId: string, event: SocketEvent, payload: unknown): void {
  io?.to(lotRoom(lotId)).emit(event, payload);
}

export function emitToUser(userId: string, event: SocketEvent, payload: unknown): void {
  io?.to(userRoom(userId)).emit(event, payload);
}

/** Falha ao avisar só é logada: a operação já foi commitada. */
export async function notifyAfterCommit(what: string, send: () => Promise<void>): Promise<void> {
  try {
    await send();
  } catch (err) {
    console.error(`[socket] falha ao avisar ${what}:`, err instanceof Error ? err.message : err);
  }
}

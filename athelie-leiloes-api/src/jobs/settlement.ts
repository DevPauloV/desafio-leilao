import { randomBytes } from 'node:crypto';
import type { RequestHandler } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { LotState, RECEIPT_CODE_BYTES, SETTLEMENT_SWEEP_INTERVAL_MS, SocketEvent, WalletEntryType } from '../constants.js';
import { pseudonym } from '../domain/audit-chain.js';
import { Lot } from '../models/Lot.js';
import { User } from '../models/User.js';
import { emitToLot, emitToUser, notifyAfterCommit } from '../realtime/socket.js';
import { getWallet, recordEntry } from '../services/wallet.js';

/** `false` se outra varredura chegou antes ou um lance de última hora prorrogou o fim (update condicional). */
async function settleLot(lotId: string, now: Date): Promise<boolean> {
  const outcome = await mongoose.connection.transaction(async (session) => {
    const due = { _id: lotId, state: LotState.ACTIVE, endsAt: { $lte: now } };
    const lot = await Lot.findOne(due).session(session).lean();
    if (!lot) return null;

    const winnerId = lot.leaderId?.toString() ?? null;
    const amount = winnerId ? lot.currentBid : null;
    const result = {
      winnerId,
      winnerPseudonym: winnerId ? pseudonym(env.AUDIT_SECRET, winnerId, lotId) : null,
      amount,
      receiptCode: winnerId ? randomBytes(RECEIPT_CODE_BYTES).toString('base64url') : null,
      chainHash: lot.chainHead.lastHash,
      settledAt: now,
    };
    const settled = await Lot.updateOne(
      { ...due, bidCount: lot.bidCount },
      { $set: { state: LotState.SETTLED, result } },
      { session },
    );
    if (settled.modifiedCount !== 1) return null;

    if (winnerId && amount != null) {
      const winner = await User.findOneAndUpdate(
        { _id: winnerId },
        { $inc: { 'wallet.balance': -amount, 'wallet.committed': -amount } },
        { returnDocument: 'after', session },
      ).lean();
      if (winner) {
        await recordEntry(session, {
          userId: winnerId,
          type: WalletEntryType.WIN,
          amount,
          wallet: winner.wallet,
          lot: { id: lot._id, title: lot.item.title },
        });
      }
      await User.updateOne({ _id: lot.auctioneerId }, { $inc: { 'wallet.balance': amount } }, { session });
    }
    return { winnerId, winnerPseudonym: result.winnerPseudonym, amount, auctioneerId: lot.auctioneerId.toString() };
  });
  if (!outcome) return false;

  await notifyAfterCommit('liquidação', async () => {
    const { winnerId, winnerPseudonym, amount, auctioneerId } = outcome;
    const ended = { lotId, winnerPseudonym, amount };
    emitToLot(lotId, SocketEvent.LOT_ENDED, ended);
    // O painel do leiloeiro atualiza o resultado e o total recebido sem estar na sala do lote.
    emitToUser(auctioneerId, SocketEvent.LOT_ENDED, ended);
    if (winnerId) emitToUser(winnerId, SocketEvent.WALLET_UPDATE, await getWallet(winnerId));
  });
  return true;
}

export async function settleDueLots(now: Date = new Date()): Promise<number> {
  const due = await Lot.find({ state: LotState.ACTIVE, endsAt: { $lte: now } }, { _id: 1 }).lean();
  let settled = 0;
  for (const { _id } of due) {
    const lotId = _id.toString();
    try {
      if (await settleLot(lotId, now)) settled += 1;
    } catch (err) {
      console.error(`[liquidação] falha no lote ${lotId}:`, err instanceof Error ? err.message : err);
    }
  }
  return settled;
}

let running = false;
let lastSweepAt = 0;

async function sweep(): Promise<void> {
  if (running) return;
  running = true;
  lastSweepAt = Date.now();
  try {
    await settleDueLots();
  } catch (err) {
    console.error('[liquidação] falha na varredura:', err instanceof Error ? err.message : err);
  } finally {
    running = false;
  }
}

/** Roda já no boot para liquidar o que venceu com a API desligada. */
export function startSettlementSweep(): NodeJS.Timeout {
  void sweep();
  return setInterval(sweep, SETTLEMENT_SWEEP_INTERVAL_MS);
}

/** Na Vercel a instância pausa sem requisição e o `setInterval` para: quem chega liquida o que venceu (ADR 0005). */
export const settleDueMiddleware: RequestHandler = async (_req, _res, next) => {
  if (Date.now() - lastSweepAt >= SETTLEMENT_SWEEP_INTERVAL_MS) await sweep();
  next();
};

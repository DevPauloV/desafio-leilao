import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { LotState, RECEIPT_CODE_BYTES, SETTLEMENT_SWEEP_INTERVAL_MS, SocketEvent } from '../constants.js';
import { pseudonym } from '../domain/audit-chain.js';
import { Lot } from '../models/Lot.js';
import { User } from '../models/User.js';
import { emitToLot, emitToUser, notifyAfterCommit } from '../realtime/socket.js';
import { getWallet } from '../services/wallet.js';

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
      await User.updateOne(
        { _id: winnerId },
        { $inc: { 'wallet.balance': -amount, 'wallet.committed': -amount } },
        { session },
      );
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

/** Roda já no boot para liquidar o que venceu com a API desligada. */
export function startSettlementSweep(): NodeJS.Timeout {
  let running = false;
  const sweep = async () => {
    if (running) return;
    running = true;
    try {
      await settleDueLots();
    } catch (err) {
      console.error('[liquidação] falha na varredura:', err instanceof Error ? err.message : err);
    } finally {
      running = false;
    }
  };
  void sweep();
  return setInterval(sweep, SETTLEMENT_SWEEP_INTERVAL_MS);
}

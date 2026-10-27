import mongoose, { mongo, Types } from 'mongoose';
import { z } from 'zod';
import { env } from '../config/env.js';
import { ErrorCode, LotState, MyBidStatus, SocketEvent } from '../constants.js';
import { bidHash, headSignature, pseudonym } from '../domain/audit-chain.js';
import { antiSniping, minimumNextBid, validateBid } from '../domain/bid-rules.js';
import { AppError } from '../errors.js';
import { Bid, toBidView } from '../models/Bid.js';
import { Lot, type LotDoc } from '../models/Lot.js';
import { User } from '../models/User.js';
import { emitToLot, emitToUser, notifyAfterCommit } from '../realtime/socket.js';
import { toLotSummary } from './lots.js';
import { getWallet } from './wallet.js';

export const placeBidSchema = z.object({
  amount: z.int({ error: 'Informe um valor válido para o lance.' }).positive('O lance precisa ser maior que zero.'),
});
export type PlaceBidInput = z.infer<typeof placeBidSchema>;

/**
 * Faz o withTransaction refazer a transação inteira (nova leitura e nova validação).
 * Na prática quase nunca chega aqui: dentro da transação, uma escrita concorrente no mesmo documento já
 * gera WriteConflict, que o driver repete sozinho. As condições abaixo são a segunda barreira.
 */
function retryWithFreshState(): mongo.MongoError {
  const error = new mongo.MongoError('Estado mudou durante o lance; repetindo a transação.');
  error.addErrorLabel('TransientTransactionError');
  return error;
}

/**
 * Lance numa única transação: valida, atualiza o lote (condicionado ao bidCount lido), compromete o saldo
 * do novo líder, libera o do anterior e grava o lance encadeado. Em conflito, a transação é refeita e o
 * lance é validado de novo contra o estado novo. Os avisos do socket saem só depois do commit.
 */
export async function placeBid(userId: string, lotId: string, amount: number) {
  const { response, title, bidCount, previousLeaderId } = await mongoose.connection.transaction(async (session) => {
    const now = new Date();
    const lot = await Lot.findById(lotId).session(session).lean();
    if (!lot) throw new AppError(ErrorCode.NOT_FOUND);
    const user = await User.findById(userId).session(session).lean();
    if (!user) throw new AppError(ErrorCode.UNAUTHENTICATED);

    const rejection = validateBid({
      lot: { ...lot, leaderId: lot.leaderId?.toString() ?? null },
      user: { id: userId, role: user.role, wallet: user.wallet },
      amount,
      now,
    });
    if (rejection) throw new AppError(rejection.code, rejection.details);

    const { endsAt, extended } = antiSniping(lot.endsAt, now);
    const lotKey = lot._id.toString();
    const seq = lot.bidCount + 1;
    const prevHash = lot.chainHead.lastHash;
    const bid = { lotId: lotKey, seq, pseudonym: pseudonym(env.AUDIT_SECRET, userId, lotKey), amount, createdAt: now, prevHash };
    const hash = bidHash(env.AUDIT_SECRET, bid);

    const lotUpdate = await Lot.updateOne(
      { _id: lot._id, bidCount: lot.bidCount },
      {
        $set: {
          currentBid: amount,
          leaderId: userId,
          bidCount: seq,
          endsAt,
          chainHead: { lastHash: hash, signature: headSignature(env.AUDIT_SECRET, lotKey, seq, hash) },
        },
      },
      { session },
    );
    if (lotUpdate.modifiedCount !== 1) throw retryWithFreshState();

    // Compromete só se ainda couber no disponível.
    const walletUpdate = await User.updateOne(
      { _id: userId, $expr: { $gte: [{ $subtract: ['$wallet.balance', '$wallet.committed'] }, amount] } },
      { $inc: { 'wallet.committed': amount } },
      { session },
    );
    if (walletUpdate.modifiedCount !== 1) throw retryWithFreshState();

    // O líder anterior foi superado: o valor dele volta ao disponível na hora.
    if (lot.leaderId && lot.currentBid != null) {
      await User.updateOne({ _id: lot.leaderId }, { $inc: { 'wallet.committed': -lot.currentBid } }, { session });
    }

    await Bid.create([{ ...bid, lotId: lot._id, bidderId: userId, hash }], { session });

    return {
      response: {
        bid: toBidView(bid),
        currentBid: amount,
        minimumNextBid: minimumNextBid({ ...lot, currentBid: amount }),
        endsAt,
        extended,
      },
      title: lot.item.title,
      bidCount: seq,
      previousLeaderId: lot.leaderId?.toString() ?? null,
    };
  });

  await notifyAfterCommit('lance', async () => {
    const serverTime = new Date();
    const { bid, currentBid, minimumNextBid: nextMinimum, endsAt, extended } = response;
    emitToLot(lotId, SocketEvent.BID_NEW, { lotId, bid, currentBid, minimumNextBid: nextMinimum, endsAt, bidCount, serverTime });
    if (extended) emitToLot(lotId, SocketEvent.LOT_EXTENDED, { lotId, endsAt, serverTime });
    if (previousLeaderId) {
      emitToUser(previousLeaderId, SocketEvent.BID_OUTBID, { lotId, title, currentBid });
      emitToUser(previousLeaderId, SocketEvent.WALLET_UPDATE, await getWallet(previousLeaderId));
    }
    emitToUser(userId, SocketEvent.WALLET_UPDATE, await getWallet(userId));
  });
  return response;
}

/** Situação do licitante num lote em que deu lance (contrato, seção 6). */
function myBidStatus(lot: LotDoc, userId: string): MyBidStatus {
  if (lot.state === LotState.CANCELLED) return MyBidStatus.CANCELLED;
  if (lot.state === LotState.SETTLED) {
    return lot.result?.winnerId?.toString() === userId ? MyBidStatus.WON : MyBidStatus.LOST;
  }
  // Ativo, inclusive no intervalo entre o fim e a liquidação.
  return lot.leaderId?.toString() === userId ? MyBidStatus.WINNING : MyBidStatus.OUTBID;
}

/** Um item por lote em que o licitante deu lance, pelo lance mais recente dele primeiro. */
export async function listMyBids(userId: string) {
  // Usa o índice { bidderId, lotId }.
  const mine = await Bid.aggregate<{ _id: Types.ObjectId; myHighestBid: number }>([
    { $match: { bidderId: new Types.ObjectId(userId) } },
    { $group: { _id: '$lotId', myHighestBid: { $max: '$amount' }, lastBidAt: { $max: '$createdAt' } } },
    { $sort: { lastBidAt: -1 } },
  ]);
  const lots = await Lot.find({ _id: { $in: mine.map((entry) => entry._id) } }).lean();
  const lotsById = new Map(lots.map((lot) => [lot._id.toString(), lot]));

  const now = new Date();
  const items = mine.flatMap((entry) => {
    const lot = lotsById.get(entry._id.toString());
    if (!lot) return []; // lote apagado direto no banco: não há o que mostrar
    const myStatus = myBidStatus(lot, userId);
    const receiptCode = myStatus === MyBidStatus.WON ? lot.result?.receiptCode : null;
    return [{ lot: toLotSummary(lot, now), myHighestBid: entry.myHighestBid, myStatus, ...(receiptCode && { receiptCode }) }];
  });
  return { items };
}

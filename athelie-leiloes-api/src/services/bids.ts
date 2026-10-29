import mongoose, { mongo, Types } from 'mongoose';
import { env } from '../config/env.js';
import { ErrorCode, LotState, MyBidStatus, SocketEvent, WalletEntryType } from '../constants.js';
import { bidHash, headSignature, pseudonym } from '../domain/audit-chain.js';
import { antiSniping, minimumNextBid, validateBid } from '../domain/bid-rules.js';
import { AppError } from '../errors.js';
import { Bid, toBidView } from '../models/Bid.js';
import { Lot, type LotDoc } from '../models/Lot.js';
import { User } from '../models/User.js';
import { emitToLot, emitToUser, notifyAfterCommit } from '../realtime/socket.js';
import { toLotSummary } from './lots.js';
import { getWallet, recordEntry } from './wallet.js';

/** Erro transitório: o withTransaction refaz tudo com estado novo (segunda barreira, além do WriteConflict). */
function retryWithFreshState(): mongo.MongoError {
  const error = new mongo.MongoError('Estado mudou durante o lance; repetindo a transação.');
  error.addErrorLabel('TransientTransactionError');
  return error;
}

export async function placeBid(userId: string, lotId: string, amount: number) {
  const { response, title, auctioneerId, bidCount, previousLeaderId } = await mongoose.connection.transaction(async (session) => {
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
    const bidder = await User.findOneAndUpdate(
      { _id: userId, $expr: { $gte: [{ $subtract: ['$wallet.balance', '$wallet.committed'] }, amount] } },
      { $inc: { 'wallet.committed': amount } },
      { returnDocument: 'after', session },
    ).lean();
    if (!bidder) throw retryWithFreshState();
    const entryLot = { id: lot._id, title: lot.item.title };
    await recordEntry(session, { userId, type: WalletEntryType.HOLD, amount, wallet: bidder.wallet, lot: entryLot });

    if (lot.leaderId && lot.currentBid != null) {
      const previous = await User.findOneAndUpdate(
        { _id: lot.leaderId },
        { $inc: { 'wallet.committed': -lot.currentBid } },
        { returnDocument: 'after', session },
      ).lean();
      if (previous) {
        await recordEntry(session, {
          userId: lot.leaderId,
          type: WalletEntryType.RELEASE,
          amount: lot.currentBid,
          wallet: previous.wallet,
          lot: entryLot,
        });
      }
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
      auctioneerId: lot.auctioneerId.toString(),
      bidCount: seq,
      previousLeaderId: lot.leaderId?.toString() ?? null,
    };
  });

  await notifyAfterCommit('lance', async () => {
    const serverTime = new Date();
    const { bid, currentBid, minimumNextBid: nextMinimum, endsAt, extended } = response;
    const bidNew = { lotId, bid, currentBid, minimumNextBid: nextMinimum, endsAt, bidCount, serverTime };
    emitToLot(lotId, SocketEvent.BID_NEW, bidNew);
    emitToUser(auctioneerId, SocketEvent.BID_NEW, bidNew); // o painel do leiloeiro não entra na sala do lote
    if (extended) emitToLot(lotId, SocketEvent.LOT_EXTENDED, { lotId, endsAt, serverTime });
    if (previousLeaderId) {
      emitToUser(previousLeaderId, SocketEvent.BID_OUTBID, { lotId, title, currentBid });
      emitToUser(previousLeaderId, SocketEvent.WALLET_UPDATE, await getWallet(previousLeaderId));
    }
    emitToUser(userId, SocketEvent.WALLET_UPDATE, await getWallet(userId));
  });
  return response;
}

function myBidStatus(lot: LotDoc, userId: string): MyBidStatus {
  if (lot.state === LotState.CANCELLED) return MyBidStatus.CANCELLED;
  if (lot.state === LotState.SETTLED) {
    return lot.result?.winnerId?.toString() === userId ? MyBidStatus.WON : MyBidStatus.LOST;
  }
  // Ativo, inclusive no intervalo entre o fim e a liquidação.
  return lot.leaderId?.toString() === userId ? MyBidStatus.WINNING : MyBidStatus.OUTBID;
}

export async function listMyBids(userId: string) {
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

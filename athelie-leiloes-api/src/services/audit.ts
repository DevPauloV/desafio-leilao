import { env } from '../config/env.js';
import { ErrorCode } from '../constants.js';
import { verifyChain } from '../domain/audit-chain.js';
import { lotStatus } from '../domain/bid-rules.js';
import { AppError } from '../errors.js';
import { Bid } from '../models/Bid.js';
import { Lot } from '../models/Lot.js';
import { imageUrl } from './lots.js';

export async function auditLot(id: string) {
  const lot = await Lot.findById(id).lean();
  if (!lot) throw new AppError(ErrorCode.NOT_FOUND);
  // Desempate por _id: com seq repetido, o lance original (inserido antes) vem primeiro.
  const bids = await Bid.find({ lotId: lot._id }).sort({ seq: 1, _id: 1 }).lean();

  const { result } = lot;
  const { bids: checked, verdict } = verifyChain(
    env.AUDIT_SECRET,
    {
      id: lot._id.toString(),
      state: lot.state,
      bidCount: lot.bidCount,
      chainHead: lot.chainHead,
      leaderId: lot.leaderId?.toString() ?? null,
      currentBid: lot.currentBid ?? null,
      result: result
        ? {
            winnerId: result.winnerId?.toString() ?? null,
            winnerPseudonym: result.winnerPseudonym ?? null,
            amount: result.amount ?? null,
            chainHash: result.chainHash,
          }
        : null,
    },
    bids.map((bid) => ({ ...bid, lotId: lot._id.toString(), bidderId: String(bid.bidderId) })),
  );

  const checkedAt = new Date();
  return {
    lot: {
      id: lot._id.toString(),
      title: lot.item.title,
      artist: lot.item.artist ?? null,
      imageUrl: imageUrl(lot.item.imageId),
      status: lotStatus(lot, checkedAt),
      startsAt: lot.startsAt,
      endsAt: lot.endsAt,
    },
    // Lista explícita de campos: bidderId não sai.
    bids: checked.map((bid) => ({
      seq: bid.seq,
      pseudonym: bid.pseudonym,
      amount: bid.amount,
      createdAt: bid.createdAt,
      prevHash: bid.prevHash,
      hash: bid.hash,
      valid: bid.valid,
    })),
    verdict,
    checkedAt,
  };
}

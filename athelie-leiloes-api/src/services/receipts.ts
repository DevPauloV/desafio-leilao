import { ErrorCode } from '../constants.js';
import { AppError } from '../errors.js';
import { Lot } from '../models/Lot.js';
import { imageUrl } from './lots.js';

export async function getReceipt(code: string) {
  const lot = await Lot.findOne({ 'result.receiptCode': code }).lean();
  if (!lot?.result) throw new AppError(ErrorCode.NOT_FOUND);
  return {
    code,
    lot: {
      id: lot._id.toString(),
      title: lot.item.title,
      artist: lot.item.artist ?? null,
      date: lot.item.date ?? null,
      medium: lot.item.medium ?? null,
      department: lot.item.department ?? null,
      imageUrl: imageUrl(lot.item.imageId),
      metUrl: lot.item.metUrl ?? null,
    },
    winnerPseudonym: lot.result.winnerPseudonym,
    amount: lot.result.amount,
    settledAt: lot.result.settledAt,
    chainHash: lot.result.chainHash,
  };
}

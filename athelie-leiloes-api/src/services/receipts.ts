import { z } from 'zod';
import { ErrorCode, RECEIPT_CODE_BYTES } from '../constants.js';
import { AppError } from '../errors.js';
import { Lot } from '../models/Lot.js';
import { imageUrl } from './lots.js';

/** base64url de RECEIPT_CODE_BYTES bytes, sem padding. */
const RECEIPT_CODE_LENGTH = Math.ceil((RECEIPT_CODE_BYTES * 4) / 3);
export const receiptParams = z.object({
  code: z.string().regex(new RegExp(`^[A-Za-z0-9_-]{${RECEIPT_CODE_LENGTH}}$`)),
});
export type ReceiptParams = z.infer<typeof receiptParams>;

/** Comprovante público: obra, valor e pseudônimo do vencedor. Nunca nome, e-mail ou id de usuário. */
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

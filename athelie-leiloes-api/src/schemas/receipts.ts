import { z } from 'zod';
import { RECEIPT_CODE_BYTES } from '../constants.js';

/** base64url sem padding. */
const RECEIPT_CODE_LENGTH = Math.ceil((RECEIPT_CODE_BYTES * 4) / 3);
export const receiptParams = z.object({
  code: z.string().regex(new RegExp(`^[A-Za-z0-9_-]{${RECEIPT_CODE_LENGTH}}$`)),
});
export type ReceiptParams = z.infer<typeof receiptParams>;

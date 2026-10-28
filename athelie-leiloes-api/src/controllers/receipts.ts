import type { Request, Response } from 'express';
import type { ReceiptParams } from '../schemas/receipts.js';
import { getReceipt } from '../services/receipts.js';

export async function get(req: Request<ReceiptParams>, res: Response): Promise<void> {
  res.json(await getReceipt(req.params.code));
}

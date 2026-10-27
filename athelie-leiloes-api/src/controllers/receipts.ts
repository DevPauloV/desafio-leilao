import type { Request, Response } from 'express';
import { getReceipt, type ReceiptParams } from '../services/receipts.js';

export async function get(req: Request<ReceiptParams>, res: Response): Promise<void> {
  res.json(await getReceipt(req.params.code));
}

import type { Request, Response } from 'express';
import type { IdParams } from '../middlewares/validate.js';
import { auditLot } from '../services/audit.js';

export async function get(req: Request<IdParams>, res: Response): Promise<void> {
  res.json(await auditLot(req.params.id));
}

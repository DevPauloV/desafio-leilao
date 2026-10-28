import type { Request, Response } from 'express';
import { ErrorCode } from '../constants.js';
import { AppError } from '../errors.js';
import type { IdParams } from '../middlewares/validate.js';
import type { PlaceBidInput } from '../schemas/bids.js';
import { listMyBids, placeBid } from '../services/bids.js';

export async function place(req: Request<IdParams, unknown, PlaceBidInput>, res: Response): Promise<void> {
  if (!req.auth) throw new AppError(ErrorCode.UNAUTHENTICATED);
  res.status(201).json(await placeBid(req.auth.id, req.params.id, req.body.amount));
}

export async function listMine(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw new AppError(ErrorCode.UNAUTHENTICATED);
  res.json(await listMyBids(req.auth.id));
}

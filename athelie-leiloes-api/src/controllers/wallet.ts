import type { Request, Response } from 'express';
import { ErrorCode } from '../constants.js';
import { AppError } from '../errors.js';
import * as walletService from '../services/wallet.js';
import type { DepositInput, EntriesQuery } from '../schemas/wallet.js';

function authUserId(req: Request<unknown, unknown, unknown>): string {
  if (!req.auth) throw new AppError(ErrorCode.UNAUTHENTICATED);
  return req.auth.id;
}

export async function get(req: Request, res: Response): Promise<void> {
  res.json(await walletService.getWallet(authUserId(req)));
}

export async function deposit(req: Request<unknown, unknown, DepositInput>, res: Response): Promise<void> {
  res.json(await walletService.deposit(authUserId(req), req.body.amount));
}

export async function entries(req: Request, res: Response): Promise<void> {
  const { type, period, page } = req.query as unknown as EntriesQuery;
  res.json(await walletService.listEntries(authUserId(req), type, period, page));
}

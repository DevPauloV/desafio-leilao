import type { Request, Response } from 'express';
import { ErrorCode } from '../constants.js';
import { AppError } from '../errors.js';
import type { IdParams } from '../middlewares/validate.js';
import * as lotsService from '../services/lots.js';
import type { CreateLotInput, ListLotsQuery } from '../services/lots.js';

/** Usuário logado (as rotas que chamam isto passam por requireAuth). */
function authUserId(req: Request<unknown, unknown, unknown, unknown>): string {
  if (!req.auth) throw new AppError(ErrorCode.UNAUTHENTICATED);
  return req.auth.id;
}

export async function create(req: Request<unknown, unknown, CreateLotInput>, res: Response): Promise<void> {
  res.status(201).json(await lotsService.createLot(authUserId(req), req.body));
}

export async function list(req: Request, res: Response): Promise<void> {
  // O validate já trocou req.query pelo resultado do Zod; o tipo do Express (ParsedQs) não sabe disso.
  res.json(await lotsService.listLots(req.query as unknown as ListLotsQuery));
}

export async function get(req: Request<IdParams>, res: Response): Promise<void> {
  res.json(await lotsService.getLot(req.params.id, req.auth));
}

export async function cancel(req: Request<IdParams>, res: Response): Promise<void> {
  res.json(await lotsService.cancelLot(authUserId(req), req.params.id));
}

export async function listMine(req: Request, res: Response): Promise<void> {
  res.json(await lotsService.listMyLots(authUserId(req)));
}

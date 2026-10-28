import type { Request, Response } from 'express';
import { ErrorCode } from '../constants.js';
import { AppError } from '../errors.js';
import * as authService from '../services/auth.js';
import type { LoginInput, RegisterInput } from '../schemas/auth.js';

export async function register(req: Request<unknown, unknown, RegisterInput>, res: Response): Promise<void> {
  res.status(201).json(await authService.register(req.body));
}

export async function login(req: Request<unknown, unknown, LoginInput>, res: Response): Promise<void> {
  res.json(await authService.login(req.body));
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw new AppError(ErrorCode.UNAUTHENTICATED);
  res.json(await authService.me(req.auth.id));
}

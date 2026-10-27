import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { BID_RATE_LIMIT_MAX, BID_RATE_LIMIT_WINDOW_MS, ErrorCode, Role } from '../constants.js';
import * as bids from '../controllers/bids.js';
import * as lots from '../controllers/lots.js';
import { AppError } from '../errors.js';
import { optionalAuth, requireAuth, requireRole } from '../middlewares/auth.js';
import { idParams, validate } from '../middlewares/validate.js';
import { placeBidSchema } from '../services/bids.js';
import { createLotSchema, listLotsQuery } from '../services/lots.js';

const auctioneerOnly = [requireAuth, requireRole(Role.AUCTIONEER)];

// Por usuário e em memória; vem depois do requireAuth, então req.auth sempre existe.
const bidLimiter = rateLimit({
  windowMs: BID_RATE_LIMIT_WINDOW_MS,
  limit: BID_RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.id ?? '',
  handler: (_req, _res, next) => next(new AppError(ErrorCode.RATE_LIMITED)),
});

export const lotsRouter = Router();

lotsRouter.get('/', validate({ query: listLotsQuery }), lots.list);
lotsRouter.post('/', ...auctioneerOnly, validate({ body: createLotSchema }), lots.create);
lotsRouter.get('/:id', optionalAuth, validate({ params: idParams }), lots.get);
lotsRouter.post('/:id/cancel', ...auctioneerOnly, validate({ params: idParams }), lots.cancel);
// Sem requireRole: leiloeiro recebe AUCTIONEER_CANNOT_BID (primeira regra do lance), não FORBIDDEN.
lotsRouter.post(
  '/:id/bids',
  requireAuth,
  bidLimiter,
  validate({ params: idParams, body: placeBidSchema }),
  bids.place,
);

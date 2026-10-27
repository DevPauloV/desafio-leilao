import { Router } from 'express';
import { Role } from '../constants.js';
import * as bids from '../controllers/bids.js';
import * as lots from '../controllers/lots.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

export const meRouter = Router();

meRouter.get('/lots', requireAuth, requireRole(Role.AUCTIONEER), lots.listMine);
meRouter.get('/bids', requireAuth, requireRole(Role.BIDDER), bids.listMine);

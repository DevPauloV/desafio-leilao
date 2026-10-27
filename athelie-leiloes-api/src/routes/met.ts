import { Router } from 'express';
import { Role } from '../constants.js';
import * as met from '../controllers/met.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { metSearchQuery } from '../services/met.js';

export const metRouter = Router();

metRouter.get('/search', requireAuth, requireRole(Role.AUCTIONEER), validate({ query: metSearchQuery }), met.search);

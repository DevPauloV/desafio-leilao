import { Router } from 'express';
import { Role } from '../constants.js';
import * as wallet from '../controllers/wallet.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { depositSchema } from '../services/wallet.js';

export const walletRouter = Router();

walletRouter.use(requireAuth, requireRole(Role.BIDDER));
walletRouter.get('/', wallet.get);
walletRouter.post('/deposit', validate({ body: depositSchema }), wallet.deposit);

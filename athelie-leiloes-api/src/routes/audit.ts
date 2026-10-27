import { Router } from 'express';
import * as audit from '../controllers/audit.js';
import { idParams, validate } from '../middlewares/validate.js';

export const auditRouter = Router();

auditRouter.get('/lots/:id', validate({ params: idParams }), audit.get);

import { Router } from 'express';
import * as receipts from '../controllers/receipts.js';
import { validate } from '../middlewares/validate.js';
import { receiptParams } from '../schemas/receipts.js';

export const receiptsRouter = Router();

// Código malformado responde NOT_FOUND, como um código que não existe (validate trata params assim).
receiptsRouter.get('/:code', validate({ params: receiptParams }), receipts.get);

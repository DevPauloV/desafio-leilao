import { Router } from 'express';
import * as images from '../controllers/images.js';
import { idParams, validate } from '../middlewares/validate.js';

export const imagesRouter = Router();

imagesRouter.get('/:id', validate({ params: idParams }), images.get);

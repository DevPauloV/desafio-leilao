import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ErrorCode, LOGIN_RATE_LIMIT_MAX, LOGIN_RATE_LIMIT_WINDOW_MS } from '../constants.js';
import * as auth from '../controllers/auth.js';
import { AppError } from '../errors.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { loginSchema, registerSchema } from '../schemas/auth.js';

// Por IP e em memória: vale enquanto houver uma só instância da API.
const loginLimiter = rateLimit({
  windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
  limit: LOGIN_RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new AppError(ErrorCode.RATE_LIMITED)),
});

export const authRouter = Router();

authRouter.post('/register', validate({ body: registerSchema }), auth.register);
authRouter.post('/login', loginLimiter, validate({ body: loginSchema }), auth.login);
authRouter.get('/me', requireAuth, auth.me);

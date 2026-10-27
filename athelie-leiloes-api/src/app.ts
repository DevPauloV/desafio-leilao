import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './errors.js';
import { settleDueMiddleware } from './jobs/settlement.js';
import { auditRouter } from './routes/audit.js';
import { authRouter } from './routes/auth.js';
import { imagesRouter } from './routes/images.js';
import { lotsRouter } from './routes/lots.js';
import { meRouter } from './routes/me.js';
import { metRouter } from './routes/met.js';
import { receiptsRouter } from './routes/receipts.js';
import { walletRouter } from './routes/wallet.js';

const JSON_BODY_LIMIT = '10kb';

/** Sem listen: o server.ts abre a porta e os testes usam supertest. */
export function createApp(): Express {
  const app = express();

  app.set('trust proxy', env.TRUST_PROXY);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api', settleDueMiddleware);
  app.use('/api/auth', authRouter);
  app.use('/api/met', metRouter);
  app.use('/api/lots', lotsRouter);
  app.use('/api/me', meRouter);
  app.use('/api/images', imagesRouter);
  app.use('/api/wallet', walletRouter);
  app.use('/api/receipts', receiptsRouter);
  app.use('/api/audit', auditRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

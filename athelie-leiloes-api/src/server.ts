import { createServer } from 'node:http';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { startSettlementSweep } from './jobs/settlement.js';
import { attachSocket } from './realtime/socket.js';
import { runSeed } from './seed/seed.js';

await mongoose.connect(env.MONGO_URI);

const server = createServer(createApp());
await attachSocket(server);
// Antes da varredura, para as duas não liquidarem ao mesmo tempo. Falha no seed não impede a API de subir.
if (env.SEED_ON_START) {
  await runSeed().catch((err: unknown) => console.error('[seed] falhou:', err instanceof Error ? err.message : err));
}
startSettlementSweep();

// Na Vercel a plataforma recebe as conexões pelo servidor exportado (api/index.js); no Docker e no Railway, abre a porta.
if (!env.VERCEL) {
  server.listen(env.PORT, () => {
    console.log(`API ouvindo na porta ${env.PORT}`);
  });
}

export default server;

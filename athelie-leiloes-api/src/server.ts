import { createServer } from 'node:http';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { startSettlementSweep } from './jobs/settlement.js';
import { attachSocket } from './realtime/socket.js';
import { runSeed } from './seed/seed.js';

await mongoose.connect(env.MONGO_URI);

// Express e Socket.IO no mesmo servidor HTTP (mesma porta).
const server = createServer(createApp());
attachSocket(server);
// Antes da varredura, para as duas não liquidarem ao mesmo tempo. Falha no seed não impede a API de subir.
if (env.SEED_ON_START) {
  await runSeed().catch((err: unknown) => console.error('[seed] falhou:', err instanceof Error ? err.message : err));
}
startSettlementSweep();

server.listen(env.PORT, () => {
  console.log(`API ouvindo na porta ${env.PORT}`);
});

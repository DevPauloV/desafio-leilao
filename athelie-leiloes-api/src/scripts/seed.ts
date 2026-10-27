// Roda o seed sob demanda (o mesmo do boot com SEED_ON_START=true). Idempotente.
// Uso: npm run seed   ·   no container: docker compose exec api npm run seed
import { existsSync } from 'node:fs';
import mongoose from 'mongoose';

// Fora do Docker, lê o .env da raiz do projeto; no container as variáveis já vêm do Compose.
const LOCAL_ENV_FILE = '../.env';
if (existsSync(LOCAL_ENV_FILE)) process.loadEnvFile(LOCAL_ENV_FILE);
// Depois do .env: estes módulos validam as variáveis de ambiente ao carregar.
const { env } = await import('../config/env.js');
const { runSeed } = await import('../seed/seed.js');

await mongoose.connect(env.MONGO_URI);
try {
  await runSeed();
} catch (err) {
  console.error('[seed] falhou:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

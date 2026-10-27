import { existsSync } from 'node:fs';
import mongoose from 'mongoose';

// Fora do Docker lê o .env da raiz; no container as variáveis vêm do Compose.
const LOCAL_ENV_FILE = '../.env';
if (existsSync(LOCAL_ENV_FILE)) process.loadEnvFile(LOCAL_ENV_FILE);
// Import dinâmico: estes módulos validam o env ao carregar, então só depois do .env.
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

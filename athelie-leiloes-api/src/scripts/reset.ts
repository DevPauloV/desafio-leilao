import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import mongoose from 'mongoose';

// Variável já definida no terminal vence o .env (loadEnvFile não sobrescreve), então dá para apontar para o Atlas.
const LOCAL_ENV_FILE = '../.env';
if (existsSync(LOCAL_ENV_FILE)) process.loadEnvFile(LOCAL_ENV_FILE);
const { env } = await import('../config/env.js');
const { runSeed } = await import('../seed/seed.js');

await mongoose.connect(env.MONGO_URI);
const db = mongoose.connection.db;
if (!db) throw new Error('sem conexão com o banco');

// Mostra só host e banco, nunca usuário nem senha.
const host = new URL(env.MONGO_URI).host;
console.log(`Banco: ${db.databaseName} em ${host}`);
console.log('Isto APAGA todos os dados (contas, lotes, lances, imagens) e recria o seed.');
console.log('Em produção, AUDIT_SECRET deve ser o mesmo da Vercel; senão a auditoria acusará adulteração.');

const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question('Digite "sim" para continuar: ');
rl.close();

try {
  if (answer.trim().toLowerCase() !== 'sim') {
    console.log('Cancelado, nada foi alterado.');
  } else {
    for (const { name } of await db.listCollections({}, { nameOnly: true }).toArray()) {
      await db.collection(name).deleteMany({});
    }
    await runSeed();
  }
} catch (err) {
  console.error('[reset] falhou:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

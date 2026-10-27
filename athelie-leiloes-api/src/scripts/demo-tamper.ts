import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import mongoose, { Types } from 'mongoose';
import { z } from 'zod';
import { objectId } from '../middlewares/validate.js';
import { Bid } from '../models/Bid.js';

const Tamper = {
  ALTER: 'alter',
  REMOVE: 'remove',
  INSERT: 'insert',
} as const;
type Tamper = (typeof Tamper)[keyof typeof Tamper];

const LAST_FLAG = '--last';
const USAGE = `Uso: npm run demo:tamper -- <lotId> <${Object.values(Tamper).join('|')}> [${LAST_FLAG}]
  alter   muda o valor de um lance do meio
  remove  apaga um lance do meio (${LAST_FLAG}: apaga o último)
  insert  insere um lance falso no fim, com um hash qualquer`;
// Centavos (R$ 10,00).
const TAMPER_AMOUNT = 1_000;

const args = z.object({ lotId: objectId, tamper: z.enum(Tamper), last: z.boolean() });

const parsed = args.safeParse({
  lotId: process.argv[2],
  tamper: process.argv[3],
  last: process.argv.includes(LAST_FLAG),
});
if (!parsed.success) {
  console.error(USAGE);
  process.exit(1);
}
const { lotId, tamper, last } = parsed.data;

// Fora do Docker lê o .env da raiz; no container as variáveis vêm do Compose.
const LOCAL_ENV_FILE = '../.env';
if (existsSync(LOCAL_ENV_FILE)) process.loadEnvFile(LOCAL_ENV_FILE);
// Import dinâmico: estes módulos validam o env ao carregar, então só depois do .env.
const { env } = await import('../config/env.js');
const { auditLot } = await import('../services/audit.js');

async function apply(kind: Tamper): Promise<string> {
  const bids = await Bid.find({ lotId }).sort({ seq: 1 }).lean();
  const lastBid = bids.at(-1);
  if (!lastBid) throw new Error('O lote não tem lances; dê alguns lances antes de adulterar.');
  const middle = bids[Math.floor(bids.length / 2)]!;

  if (kind === Tamper.ALTER) {
    await Bid.updateOne({ _id: middle._id }, { $inc: { amount: TAMPER_AMOUNT } });
    return `valor do lance #${middle.seq} mudou de ${middle.amount} para ${middle.amount + TAMPER_AMOUNT} centavos`;
  }
  if (kind === Tamper.REMOVE) {
    const target = last ? lastBid : middle;
    await Bid.deleteOne({ _id: target._id });
    return `lance #${target.seq} apagado`;
  }
  await Bid.create({
    lotId,
    seq: lastBid.seq + 1,
    bidderId: new Types.ObjectId(),
    pseudonym: lastBid.pseudonym,
    amount: lastBid.amount + TAMPER_AMOUNT,
    createdAt: new Date(),
    prevHash: lastBid.hash,
    hash: randomBytes(32).toString('hex'), // sem o AUDIT_SECRET, não dá para calcular o hash certo
  });
  return `lance falso #${lastBid.seq + 1} inserido no fim`;
}

const show = (label: string, verdict: unknown) => console.log(`${label}: ${JSON.stringify(verdict)}`);

await mongoose.connect(env.MONGO_URI);
try {
  show('Antes ', (await auditLot(lotId)).verdict);
  console.log(`Adulteração (${tamper}): ${await apply(tamper)}`);
  show('Depois', (await auditLot(lotId)).verdict);
  console.log(`Veja na auditoria: ${env.CORS_ORIGIN[0]}/auditoria/${lotId}`);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

// Seed de demonstração (contrato, seção 8). Idempotente e sem chamar o Met: as obras e as imagens vêm de
// athelie-leiloes-api/seed/, copiadas uma vez do Met (domínio público, CC0). Lances, liquidação e cancelamento
// passam pelos serviços reais, então a cadeia HMAC e as carteiras ficam como numa operação de verdade.
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { LotState, LotStatus, Role } from '../constants.js';
import { settleDueLots } from '../jobs/settlement.js';
import { Lot } from '../models/Lot.js';
import { User } from '../models/User.js';
import { register } from '../services/auth.js';
import { placeBid } from '../services/bids.js';
import { cancelLot, saveLot } from '../services/lots.js';
import { deposit } from '../services/wallet.js';

/** Pasta com artworks.json e images/ (a mesma em src/seed e em dist/seed). */
const SEED_DIR = new URL('../../seed/', import.meta.url);

/** Senha única das contas de demonstração (documentada no README). */
export const SEED_PASSWORD = 'athelie12345';
export const SEED_ACCOUNTS = {
  auctioneer: { name: 'Leiloeiro', email: 'leiloeiro@athelie.dev', role: Role.AUCTIONEER },
  bidder01: { name: 'Licitante 01', email: 'licitante01@athelie.dev', role: Role.BIDDER },
  bidder02: { name: 'Licitante 02', email: 'licitante02@athelie.dev', role: Role.BIDDER },
} as const;
/** Depósito inicial de cada licitante: R$ 50.000,00. */
export const SEED_DEPOSIT = 5_000_000;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Papel de cada obra (metObjectId de seed/artworks.json) e os lances, alternados: licitante 01, licitante 02, licitante 01… */
export const SEED_LOTS = {
  live: { metObjectId: 436524, startingBid: 150_000, minIncrement: 10_000, bids: [150_000, 160_000, 175_000] },
  scheduled: { metObjectId: 45434, startingBid: 80_000, minIncrement: 5_000, bids: [] },
  settled: { metObjectId: 437881, startingBid: 200_000, minIncrement: 10_000, bids: [200_000, 210_000] },
  cancelled: { metObjectId: 438817, startingBid: 120_000, minIncrement: 10_000, bids: [120_000] },
} as const;
type SeedLot = { metObjectId: number; startingBid: number; minIncrement: number; bids: readonly number[] };

/**
 * Mais 16 lotes, um por obra, para a vitrine ter variedade: ao vivo com fins espalhados, agendados e encerrados.
 * Cada um é criado uma vez só (reconhecido pela obra). `startsIn` e `endsIn` contam a partir da hora do seed.
 */
export const SEED_CATALOG: readonly (SeedLot & { status: LotStatus; startsIn?: number; endsIn?: number })[] = [
  { status: LotStatus.LIVE, metObjectId: 436535, startingBid: 120_000, minIncrement: 10_000, bids: [120_000, 130_000, 145_000], endsIn: 2 * HOUR },
  { status: LotStatus.LIVE, metObjectId: 11417, startingBid: 250_000, minIncrement: 10_000, bids: [250_000, 275_000], endsIn: 6 * HOUR },
  { status: LotStatus.LIVE, metObjectId: 435809, startingBid: 180_000, minIncrement: 10_000, bids: [], endsIn: 12 * HOUR },
  { status: LotStatus.LIVE, metObjectId: 437394, startingBid: 300_000, minIncrement: 20_000, bids: [300_000], endsIn: DAY },
  { status: LotStatus.LIVE, metObjectId: 435868, startingBid: 180_000, minIncrement: 10_000, bids: [180_000, 190_000, 200_000, 215_000], endsIn: 2 * DAY },
  { status: LotStatus.LIVE, metObjectId: 437654, startingBid: 160_000, minIncrement: 10_000, bids: [], endsIn: 3 * DAY },
  { status: LotStatus.LIVE, metObjectId: 436965, startingBid: 90_000, minIncrement: 5_000, bids: [90_000, 95_000], endsIn: 5 * DAY },
  { status: LotStatus.LIVE, metObjectId: 45734, startingBid: 40_000, minIncrement: 2_000, bids: [40_000], endsIn: 7 * DAY },
  { status: LotStatus.LIVE, metObjectId: 22270, startingBid: 70_000, minIncrement: 5_000, bids: [], endsIn: 10 * DAY },
  { status: LotStatus.SCHEDULED, metObjectId: 459055, startingBid: 200_000, minIncrement: 10_000, bids: [], startsIn: 6 * HOUR, endsIn: 3 * DAY },
  { status: LotStatus.SCHEDULED, metObjectId: 248132, startingBid: 60_000, minIncrement: 5_000, bids: [], startsIn: 2 * DAY, endsIn: 5 * DAY },
  { status: LotStatus.SCHEDULED, metObjectId: 437153, startingBid: 150_000, minIncrement: 10_000, bids: [], startsIn: 4 * DAY, endsIn: 8 * DAY },
  { status: LotStatus.ENDED, metObjectId: 436105, startingBid: 220_000, minIncrement: 10_000, bids: [220_000, 230_000, 250_000] },
  { status: LotStatus.ENDED, metObjectId: 10497, startingBid: 100_000, minIncrement: 10_000, bids: [100_000, 110_000] },
  { status: LotStatus.ENDED, metObjectId: 544740, startingBid: 80_000, minIncrement: 5_000, bids: [] },
  { status: LotStatus.ENDED, metObjectId: 435621, startingBid: 140_000, minIncrement: 10_000, bids: [140_000] },
];

const artworksSchema = z.array(
  z.object({
    metObjectId: z.int().positive(),
    title: z.string().min(1),
    artist: z.string().nullable(),
    date: z.string().nullable(),
    medium: z.string().nullable(),
    department: z.string().nullable(),
    metUrl: z.url().nullable(),
    image: z.string().regex(/^images\/[\w.-]+$/),
    contentType: z.string().startsWith('image/'),
  }),
);

async function ensureAccount(account: (typeof SEED_ACCOUNTS)[keyof typeof SEED_ACCOUNTS]) {
  const existing = await User.findOne({ email: account.email }).lean();
  if (existing) return { id: existing._id.toString(), created: false };
  const { user } = await register({ ...account, password: SEED_PASSWORD });
  if (account.role === Role.BIDDER) await deposit(user.id, SEED_DEPOSIT);
  return { id: user.id, created: true };
}

/**
 * Cria as contas e os lotes que faltarem. Lotes do seed = lotes do leiloeiro do seed; o papel de cada um sai
 * do estado e da obra, sem campo novo no banco. Devolve só contagens (nada de dados pessoais no log).
 */
export async function runSeed(): Promise<{ accounts: number; lots: number }> {
  const artworks = artworksSchema.parse(JSON.parse(await readFile(new URL('artworks.json', SEED_DIR), 'utf8')));
  const accounts = {
    auctioneer: await ensureAccount(SEED_ACCOUNTS.auctioneer),
    bidder01: await ensureAccount(SEED_ACCOUNTS.bidder01),
    bidder02: await ensureAccount(SEED_ACCOUNTS.bidder02),
  };
  const auctioneerId = accounts.auctioneer.id;
  const bidders = [accounts.bidder01.id, accounts.bidder02.id];

  /** Cria o lote com a obra do plano e dá os lances pelo serviço real. */
  async function createLot(plan: SeedLot, startsAt: Date, endsAt: Date) {
    const artwork = artworks.find((candidate) => candidate.metObjectId === plan.metObjectId);
    if (!artwork) throw new Error(`Obra ${plan.metObjectId} ausente em seed/artworks.json`);
    const { image, contentType, ...copy } = artwork;
    const data = await readFile(new URL(image, SEED_DIR));
    const lot = await saveLot(auctioneerId, copy, { data, contentType }, { ...plan, startsAt, endsAt });
    const lotId = lot._id.toString();
    for (const [index, amount] of plan.bids.entries()) await placeBid(bidders[index % bidders.length]!, lotId, amount);
    return lotId;
  }

  const now = Date.now();
  const startedNow = new Date(now - MINUTE);
  const seedLot = (filter: Record<string, unknown>) => Lot.exists({ auctioneerId, ...filter });
  let lots = 0;

  // Ao vivo com lances: renovável, para quem avaliar dias depois ainda encontrar um leilão aberto.
  const live = { state: LotState.ACTIVE, startsAt: { $lte: new Date(now) }, endsAt: { $gt: new Date(now) } };
  if (!(await seedLot({ ...live, bidCount: { $gt: 0 } }))) {
    await createLot(SEED_LOTS.live, startedNow, new Date(now + 3 * DAY));
    lots += 1;
  }
  // Agendado: também renovável, senão vira "ao vivo" depois de um dia e a vitrine fica sem agendado.
  if (!(await seedLot({ state: LotState.ACTIVE, startsAt: { $gt: new Date(now) } }))) {
    await createLot(SEED_LOTS.scheduled, new Date(now + DAY), new Date(now + 4 * DAY));
    lots += 1;
  }
  // Encerrado: lances ao vivo, fim logo depois do último lance e liquidação pelo job real.
  async function createEnded(plan: SeedLot) {
    const lotId = await createLot(plan, startedNow, new Date(now + HOUR));
    await Lot.updateOne({ _id: lotId }, { $set: { endsAt: new Date() } });
  }
  if (!(await seedLot({ 'item.metObjectId': SEED_LOTS.settled.metObjectId }))) {
    await createEnded(SEED_LOTS.settled);
    lots += 1;
  }
  // Catálogo: cada obra entra uma vez; depois que o lote acaba, ela fica nos encerrados.
  for (const plan of SEED_CATALOG) {
    if (await seedLot({ 'item.metObjectId': plan.metObjectId })) continue;
    if (plan.status === LotStatus.ENDED) await createEnded(plan);
    else await createLot(plan, plan.startsIn ? new Date(now + plan.startsIn) : startedNow, new Date(now + plan.endsIn!));
    lots += 1;
  }
  await settleDueLots();
  // Cancelado com lance: o cancelamento real estorna o comprometido do líder.
  if (!(await seedLot({ 'item.metObjectId': SEED_LOTS.cancelled.metObjectId }))) {
    const lotId = await createLot(SEED_LOTS.cancelled, startedNow, new Date(now + 2 * DAY));
    await cancelLot(auctioneerId, lotId);
    lots += 1;
  }

  const created = Object.values(accounts).filter((account) => account.created).length;
  console.log(`[seed] contas criadas: ${created}, lotes criados: ${lots}`);
  return { accounts: created, lots };
}

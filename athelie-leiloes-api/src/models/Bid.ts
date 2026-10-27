import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

/**
 * Lance: só inserção. Nenhum código do app altera ou apaga um lance; alteração direta no banco
 * é detectada pela cadeia de hashes (domain/audit-chain.ts).
 */
const bidSchema = new Schema({
  lotId: { type: Schema.Types.ObjectId, ref: 'Lot', required: true },
  seq: { type: Number, required: true, min: 1 },
  bidderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  pseudonym: { type: String, required: true },
  amount: { type: Number, required: true, min: 1, validate: Number.isInteger },
  // Explícito (e não via timestamps): entra no hash, então precisa ser exatamente o horário usado no cálculo.
  createdAt: { type: Date, required: true },
  prevHash: { type: String, required: true },
  hash: { type: String, required: true },
});

// Um seq por lote: dois lances nunca ocupam a mesma posição da cadeia.
bidSchema.index({ lotId: 1, seq: 1 }, { unique: true });
// Lances de um licitante (ranking no lote e "meus lances").
bidSchema.index({ bidderId: 1, lotId: 1 });

export type BidDoc = InferSchemaType<typeof bidSchema> & { _id: Types.ObjectId };

export const Bid = model('Bid', bidSchema);

export type BidView = { seq: number; pseudonym: string; amount: number; createdAt: Date };

/** Forma pública do lance: nunca expõe `bidderId`. */
export function toBidView(bid: Pick<BidDoc, 'seq' | 'pseudonym' | 'amount' | 'createdAt'>): BidView {
  return { seq: bid.seq, pseudonym: bid.pseudonym, amount: bid.amount, createdAt: bid.createdAt };
}

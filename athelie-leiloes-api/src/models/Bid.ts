import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

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
bidSchema.index({ bidderId: 1, lotId: 1 });

export type BidDoc = InferSchemaType<typeof bidSchema> & { _id: Types.ObjectId };

export const Bid = model('Bid', bidSchema);

export type BidView = { seq: number; pseudonym: string; amount: number; createdAt: Date };

/** Nunca expõe `bidderId`. */
export function toBidView(bid: Pick<BidDoc, 'seq' | 'pseudonym' | 'amount' | 'createdAt'>): BidView {
  return { seq: bid.seq, pseudonym: bid.pseudonym, amount: bid.amount, createdAt: bid.createdAt };
}

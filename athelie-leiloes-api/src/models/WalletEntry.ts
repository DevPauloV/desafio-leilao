import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { WalletEntryType } from '../constants.js';

const walletEntrySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: Object.values(WalletEntryType), required: true },
  amount: { type: Number, required: true, min: 1, validate: Number.isInteger },
  // Lote e título copiados: o extrato não depende do lote continuar igual.
  lotId: { type: Schema.Types.ObjectId, ref: 'Lot' },
  lotTitle: { type: String },
  // Saldos logo depois do movimento: o extrato mostra a evolução sem recalcular nada.
  balanceAfter: { type: Number, required: true },
  committedAfter: { type: Number, required: true },
  createdAt: { type: Date, required: true },
});

walletEntrySchema.index({ userId: 1, createdAt: -1 });

export type WalletEntryDoc = InferSchemaType<typeof walletEntrySchema> & { _id: Types.ObjectId };

export const WalletEntry = model('WalletEntry', walletEntrySchema);

export type WalletEntryView = {
  id: string;
  type: WalletEntryType;
  amount: number;
  lotId: string | null;
  lotTitle: string | null;
  balance: number;
  available: number;
  createdAt: Date;
};

/** Lista explícita de campos; `userId` nunca sai. */
export function toWalletEntryView(entry: WalletEntryDoc): WalletEntryView {
  return {
    id: entry._id.toString(),
    type: entry.type as WalletEntryType,
    amount: entry.amount,
    lotId: entry.lotId?.toString() ?? null,
    lotTitle: entry.lotTitle ?? null,
    balance: entry.balanceAfter,
    available: entry.balanceAfter - entry.committedAfter,
    createdAt: entry.createdAt,
  };
}

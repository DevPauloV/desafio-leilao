import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { GENESIS_HASH, LotState } from '../constants.js';

const cents = { type: Number, required: true, min: 1, validate: Number.isInteger };
const optionalText = { type: String, default: null };

const lotSchema = new Schema(
  {
    auctioneerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    item: {
      type: new Schema(
        {
          metObjectId: { type: Number, required: true },
          title: { type: String, required: true },
          artist: optionalText,
          date: optionalText,
          medium: optionalText,
          department: optionalText,
          metUrl: optionalText,
          imageId: { type: Schema.Types.ObjectId, ref: 'Image', required: true },
        },
        { _id: false },
      ),
      required: true,
    },
    startingBid: cents,
    minIncrement: cents,
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    state: { type: String, enum: Object.values(LotState), default: LotState.ACTIVE },
    currentBid: { type: Number, default: null },
    leaderId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    bidCount: { type: Number, default: 0 },
    chainHead: {
      type: new Schema(
        {
          lastHash: { type: String, default: GENESIS_HASH },
          signature: { type: String, default: '' },
        },
        { _id: false },
      ),
      required: true,
      default: () => ({}),
    },
    result: {
      type: new Schema(
        {
          winnerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
          winnerPseudonym: { type: String, default: null },
          amount: { type: Number, default: null },
          receiptCode: { type: String, default: null },
          chainHash: { type: String, required: true },
          settledAt: { type: Date, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
  },
  { timestamps: true },
);

// Varredura de liquidação e filtro da vitrine por estado.
lotSchema.index({ state: 1, endsAt: 1 });
// Só lotes vendidos têm código de comprovante.
lotSchema.index(
  { 'result.receiptCode': 1 },
  { unique: true, partialFilterExpression: { 'result.receiptCode': { $type: 'string' } } },
);

export type LotDoc = InferSchemaType<typeof lotSchema> & { _id: Types.ObjectId };

export const Lot = model('Lot', lotSchema);

import { Schema, model } from 'mongoose';
import { MAX_IMAGE_BYTES } from '../constants.js';

/** Cópia da imagem da obra, para a vitrine não depender do Met (ADR 0004). Nunca é alterada. */
const imageSchema = new Schema(
  {
    data: {
      type: Buffer,
      required: true,
      validate: (data: Buffer) => data.length > 0 && data.length <= MAX_IMAGE_BYTES,
    },
    contentType: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Image = model('Image', imageSchema);

import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { Role } from '../constants.js';

const cents = { type: Number, default: 0, min: 0, validate: Number.isInteger };

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(Role), required: true },
    wallet: {
      type: new Schema({ balance: cents, committed: cents }, { _id: false }),
      required: true,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };

export const User = model('User', userSchema);

export type UserView = { id: string; name: string; email: string; role: Role };

/** Lista explícita de campos: nada além disso sai na resposta, nem com `lean()`. */
export function toUserView(user: Pick<UserDoc, '_id' | 'name' | 'email' | 'role'>): UserView {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role as Role };
}

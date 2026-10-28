import { ErrorCode, LotState, MAX_DEPOSIT } from '../constants.js';
import { AppError, formatBRL } from '../errors.js';
import { Lot } from '../models/Lot.js';
import { User } from '../models/User.js';

export async function getWallet(userId: string) {
  const user = await User.findById(userId).lean();
  if (!user) throw new AppError(ErrorCode.UNAUTHENTICATED);
  const leading = await Lot.find({ leaderId: userId, state: LotState.ACTIVE }).sort({ endsAt: 1 }).lean();
  const { balance, committed } = user.wallet;
  return {
    balance,
    committed,
    available: balance - committed,
    leading: leading.map((lot) => ({
      lotId: lot._id.toString(),
      title: lot.item.title,
      amount: lot.currentBid,
      endsAt: lot.endsAt,
    })),
  };
}

/** Um `$inc` num único documento já é atômico: dispensa transação. */
export async function deposit(userId: string, amount: number) {
  const updated = await User.updateOne({ _id: userId }, { $inc: { 'wallet.balance': amount } });
  if (updated.matchedCount !== 1) throw new AppError(ErrorCode.UNAUTHENTICATED);
  return getWallet(userId);
}

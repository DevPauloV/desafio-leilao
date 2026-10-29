import type { ClientSession, Types } from 'mongoose';
import mongoose from 'mongoose';
import {
  ENTRY_FILTER_TYPES,
  EntryFilter,
  EntryPeriod,
  ErrorCode,
  LOT_PERIOD_MS,
  LotPeriod,
  LotState,
  WALLET_ENTRIES_PAGE_SIZE,
  WalletEntryType,
} from '../constants.js';
import { AppError } from '../errors.js';
import { Lot } from '../models/Lot.js';
import { User } from '../models/User.js';
import { WalletEntry, toWalletEntryView } from '../models/WalletEntry.js';

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

type EntryInput = {
  userId: Types.ObjectId | string;
  type: WalletEntryType;
  amount: number;
  /** Carteira já atualizada, como o `findOneAndUpdate` com `returnDocument: 'after'` devolve. */
  wallet: { balance: number; committed: number };
  lot?: { id: Types.ObjectId | string; title: string };
};

/** Chamado na mesma transação que mexe no saldo: o movimento e o saldo nunca divergem. */
export async function recordEntry(session: ClientSession, { userId, type, amount, wallet, lot }: EntryInput) {
  await WalletEntry.create(
    [
      {
        userId,
        type,
        amount,
        lotId: lot?.id,
        lotTitle: lot?.title,
        balanceAfter: wallet.balance,
        committedAfter: wallet.committed,
        createdAt: new Date(),
      },
    ],
    { session },
  );
}

export async function deposit(userId: string, amount: number) {
  await mongoose.connection.transaction(async (session) => {
    const user = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { 'wallet.balance': amount } },
      { returnDocument: 'after', session },
    ).lean();
    if (!user) throw new AppError(ErrorCode.UNAUTHENTICATED);
    await recordEntry(session, { userId, type: WalletEntryType.DEPOSIT, amount, wallet: user.wallet });
  });
  return getWallet(userId);
}

export async function listEntries(userId: string, filter: EntryFilter, period: EntryPeriod, page: number) {
  const query = {
    userId,
    ...(filter !== EntryFilter.ALL && { type: { $in: ENTRY_FILTER_TYPES[filter] } }),
    ...(period === EntryPeriod.WEEK && { createdAt: { $gte: new Date(Date.now() - LOT_PERIOD_MS[LotPeriod.WEEK]) } }),
  };
  const [entries, total] = await Promise.all([
    WalletEntry.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * WALLET_ENTRIES_PAGE_SIZE)
      .limit(WALLET_ENTRIES_PAGE_SIZE)
      .lean(),
    WalletEntry.countDocuments(query),
  ]);
  return { items: entries.map(toWalletEntryView), total, pageSize: WALLET_ENTRIES_PAGE_SIZE };
}

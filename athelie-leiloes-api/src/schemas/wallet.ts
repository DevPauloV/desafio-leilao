import { z } from 'zod';
import { EntryFilter, EntryPeriod, MAX_DEPOSIT, WALLET_ENTRIES_MAX_PAGE } from '../constants.js';
import { formatBRL } from '../errors.js';

export const depositSchema = z.object({
  amount: z
    .int({ error: 'Informe um valor válido para o depósito.' })
    .min(1, 'O depósito precisa ser maior que zero.')
    .max(MAX_DEPOSIT, `O depósito pode ser de no máximo ${formatBRL(MAX_DEPOSIT)}.`),
});
export type DepositInput = z.infer<typeof depositSchema>;

export const entriesQuery = z.object({
  type: z.enum(EntryFilter).default(EntryFilter.ALL),
  period: z.enum(EntryPeriod).default(EntryPeriod.WEEK),
  page: z.coerce.number().int().min(1).max(WALLET_ENTRIES_MAX_PAGE).default(1),
});
export type EntriesQuery = z.infer<typeof entriesQuery>;

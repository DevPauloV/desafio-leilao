import { z } from 'zod';
import { MAX_DEPOSIT } from '../constants.js';
import { formatBRL } from '../errors.js';

export const depositSchema = z.object({
  amount: z
    .int({ error: 'Informe um valor válido para o depósito.' })
    .min(1, 'O depósito precisa ser maior que zero.')
    .max(MAX_DEPOSIT, `O depósito pode ser de no máximo ${formatBRL(MAX_DEPOSIT)}.`),
});
export type DepositInput = z.infer<typeof depositSchema>;

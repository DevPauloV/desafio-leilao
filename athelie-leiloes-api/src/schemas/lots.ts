import { z } from 'zod';
import { LOT_SEARCH_MAX_LENGTH, LOT_START_TOLERANCE_MS, LotStatus } from '../constants.js';

/** `label` vem com artigo ("O lance inicial"). */
const cents = (label: string) =>
  z.int({ error: `Informe um valor válido para ${label.toLowerCase()}.` }).positive(`${label} precisa ser maior que zero.`);
const isoDate = z.iso
  .datetime({ offset: true, error: 'Informe data e hora válidas.' })
  .transform((value) => new Date(value));

export const createLotSchema = z
  .object({
    metObjectId: z.int().positive(),
    startingBid: cents('O lance inicial'),
    minIncrement: cents('O incremento mínimo'),
    startsAt: isoDate.refine((date) => date.getTime() >= Date.now() - LOT_START_TOLERANCE_MS, {
      message: 'O início não pode estar no passado.',
    }),
    endsAt: isoDate,
  })
  .refine((lot) => lot.endsAt > lot.startsAt, {
    path: ['endsAt'],
    message: 'O fim precisa ser depois do início.',
    // No Zod 4 a regra do objeto roda mesmo com campo inválido; só compara com as duas datas válidas.
    when: ({ issues }) => issues.length === 0,
  });
export type CreateLotInput = z.infer<typeof createLotSchema>;

export const SHOWCASE_ORDER = [LotStatus.LIVE, LotStatus.SCHEDULED, LotStatus.ENDED] as const;

export const listLotsQuery = z.object({
  status: z.enum(SHOWCASE_ORDER).optional(),
  page: z.coerce.number().int().min(1).default(1),
  q: z
    .string()
    .trim()
    .min(1, 'Digite algo para buscar.')
    .max(LOT_SEARCH_MAX_LENGTH, `A busca pode ter no máximo ${LOT_SEARCH_MAX_LENGTH} caracteres.`)
    .optional(),
  department: z.string().trim().min(1).max(LOT_SEARCH_MAX_LENGTH).optional(),
});
export type ListLotsQuery = z.infer<typeof listLotsQuery>;

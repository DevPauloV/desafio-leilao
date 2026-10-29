import { z } from 'zod';
import { LOT_SEARCH_MAX_LENGTH, LOTS_MAX_PAGE, LOT_START_TOLERANCE_MS, LotPeriod, LotStatus } from '../constants.js';

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
  })
  .refine((lot) => lot.minIncrement <= lot.startingBid, {
    path: ['minIncrement'],
    message: 'O incremento mínimo não pode ser maior que o lance inicial.',
    when: ({ issues }) => issues.length === 0,
  });
export type CreateLotInput = z.infer<typeof createLotSchema>;

export const SHOWCASE_ORDER = [LotStatus.LIVE, LotStatus.SCHEDULED, LotStatus.ENDED] as const;

const facetValue = z.string().trim().min(1).max(LOT_SEARCH_MAX_LENGTH).optional();
const priceBound = z.coerce.number({ error: 'Informe um valor válido.' }).int('Informe um valor válido.').min(0).optional();

export const listLotsQuery = z
  .object({
    status: z.enum(SHOWCASE_ORDER).optional(),
    page: z.coerce.number().int().min(1).max(LOTS_MAX_PAGE).default(1),
    q: z
      .string()
      .trim()
      .min(1, 'Digite algo para buscar.')
      .max(LOT_SEARCH_MAX_LENGTH, `A busca pode ter no máximo ${LOT_SEARCH_MAX_LENGTH} caracteres.`)
      .optional(),
    department: facetValue,
    artist: facetValue,
    minPrice: priceBound,
    maxPrice: priceBound,
    period: z.enum(Object.values(LotPeriod)).optional(),
  })
  .refine((query) => query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice, {
    path: ['maxPrice'],
    message: 'O valor máximo precisa ser maior ou igual ao mínimo.',
    when: ({ issues }) => issues.length === 0,
  });
export type ListLotsQuery = z.infer<typeof listLotsQuery>;

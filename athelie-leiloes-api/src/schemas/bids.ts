import { z } from 'zod';

export const placeBidSchema = z.object({
  amount: z.int({ error: 'Informe um valor válido para o lance.' }).positive('O lance precisa ser maior que zero.'),
});
export type PlaceBidInput = z.infer<typeof placeBidSchema>;

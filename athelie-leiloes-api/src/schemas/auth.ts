import { z } from 'zod';
import { EMAIL_MAX_LENGTH, NAME_MAX_LENGTH, NAME_MIN_LENGTH, PASSWORD_MIN_LENGTH, Role } from '../constants.js';

/** O bcrypt ignora o que passa de 72 bytes; recusar é melhor que truncar sem avisar. */
const BCRYPT_MAX_BYTES = 72;

const email = z
  .string({ error: 'Informe o e-mail.' })
  .trim()
  .toLowerCase()
  .pipe(
    z
      .email('Informe um e-mail válido.')
      .max(EMAIL_MAX_LENGTH, `O e-mail pode ter no máximo ${EMAIL_MAX_LENGTH} caracteres.`),
  );

export const registerSchema = z.object({
  name: z
    .string({ error: 'Informe o nome.' })
    .trim()
    .min(NAME_MIN_LENGTH, `O nome precisa ter pelo menos ${NAME_MIN_LENGTH} caracteres.`)
    .max(NAME_MAX_LENGTH, `O nome pode ter no máximo ${NAME_MAX_LENGTH} caracteres.`),
  email,
  password: z
    .string({ error: 'Informe a senha.' })
    .min(PASSWORD_MIN_LENGTH, `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
    .refine((value) => Buffer.byteLength(value) <= BCRYPT_MAX_BYTES, {
      message: `A senha é longa demais (o limite é de ${BCRYPT_MAX_BYTES} bytes; letras acentuadas contam como 2).`,
    }),
  role: z.enum(Role),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: z.string({ error: 'Informe a senha.' }).min(1, 'Informe a senha.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

import bcrypt from 'bcryptjs';
import { mongo } from 'mongoose';
import { z } from 'zod';
import {
  EMAIL_MAX_LENGTH,
  ErrorCode,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  PASSWORD_MIN_LENGTH,
  Role,
} from '../constants.js';
import { AppError } from '../errors.js';
import { signToken } from '../middlewares/auth.js';
import { User, toUserView, type UserView } from '../models/User.js';

const BCRYPT_ROUNDS = 10;
/** O bcrypt ignora o que passa de 72 bytes; recusar é melhor que truncar sem avisar. */
const BCRYPT_MAX_BYTES = 72;
const DUPLICATE_KEY = 11000;

// Login com e-mail inexistente compara contra este hash, para o tempo de resposta não revelar quais e-mails existem.
const DUMMY_HASH = bcrypt.hashSync('senha-que-ninguem-usa', BCRYPT_ROUNDS);

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

export type AuthResult = { token: string; user: UserView };

function authResult(user: UserView): AuthResult {
  return { token: signToken({ id: user.id, role: user.role }), user };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  try {
    const user = await User.create({ name: input.name, email: input.email, passwordHash, role: input.role });
    return authResult(toUserView(user));
  } catch (err) {
    // O índice único decide, sem consulta prévia: dois cadastros simultâneos não passam.
    if (err instanceof mongo.MongoServerError && err.code === DUPLICATE_KEY) throw new AppError(ErrorCode.EMAIL_TAKEN);
    throw err;
  }
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await User.findOne({ email: input.email }).select('+passwordHash').lean();
  const matches = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !matches) throw new AppError(ErrorCode.INVALID_CREDENTIALS);
  return authResult(toUserView(user));
}

export async function me(userId: string): Promise<{ user: UserView }> {
  const user = await User.findById(userId).lean();
  // Token válido de um usuário que não existe mais.
  if (!user) throw new AppError(ErrorCode.UNAUTHENTICATED);
  return { user: toUserView(user) };
}

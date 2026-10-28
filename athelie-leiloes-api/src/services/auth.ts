import bcrypt from 'bcryptjs';
import { mongo } from 'mongoose';
import { ErrorCode, Role } from '../constants.js';
import { AppError } from '../errors.js';
import { signToken } from '../middlewares/auth.js';
import type { LoginInput, RegisterInput } from '../schemas/auth.js';
import { User, toUserView, type UserView } from '../models/User.js';

const BCRYPT_ROUNDS = 10;
const DUPLICATE_KEY = 11000;

// Login com e-mail inexistente compara contra este hash, para o tempo de resposta não revelar quais e-mails existem.
const DUMMY_HASH = bcrypt.hashSync('senha-que-ninguem-usa', BCRYPT_ROUNDS);

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

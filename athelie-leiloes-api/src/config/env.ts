import { z } from 'zod';

z.config(z.locales.ptBR());

/** Mínimo aceito; o recomendado é 64 hex (`openssl rand -hex 32`). */
const SECRET_MIN_LENGTH = 16;
const DEFAULT_PORT = 3000;
const MAX_PORT = 65_535;

const secret = z.string().min(SECRET_MIN_LENGTH, `precisa ter ao menos ${SECRET_MIN_LENGTH} caracteres`);

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(MAX_PORT).default(DEFAULT_PORT),
  MONGO_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, 'deve começar com mongodb:// ou mongodb+srv://'),
  JWT_SECRET: secret,
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+(ms|s|m|h|d|w|y)?$/, 'use segundos ou número + unidade, ex.: 15m, 1d')
    .default('1d'),
  AUDIT_SECRET: secret,
  // Só a origem, sem barra final: é o que o navegador manda no header Origin.
  CORS_ORIGIN: z
    .string()
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean))
    .pipe(z.array(z.url().transform((url) => new URL(url).origin)).min(1)),
  // Acima de 0 sem proxy de verdade, qualquer cliente forjaria o IP do rate limit pelo X-Forwarded-For.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  SEED_ON_START: z.stringbool().default(false),
  MET_API_BASE: z.url().default('https://collectionapi.metmuseum.org/public/collection/v1'),
  // Definida pela própria Vercel ("1"); fora dela, a API abre a porta.
  VERCEL: z.stringbool().default(false),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Nunca o valor: pode ser segredo.
  const lines = parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`);
  console.error(`Variáveis de ambiente inválidas; a API não vai subir:\n${lines.join('\n')}`);
  process.exit(1);
}

export const env = parsed.data;

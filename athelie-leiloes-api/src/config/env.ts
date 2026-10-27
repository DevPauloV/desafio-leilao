import { z } from 'zod';

// Mensagens de validação do Zod em pt-BR (aparecem em details.fields).
z.config(z.locales.ptBR());

/** Tamanho mínimo de JWT_SECRET e AUDIT_SECRET (o recomendado é 64 hex, de `openssl rand -hex 32`). */
const SECRET_MIN_LENGTH = 16;
/** Porta padrão da API, a mesma do Docker Compose. */
const DEFAULT_PORT = 3000;
/** Maior porta TCP válida. */
const MAX_PORT = 65_535;

const secret = z.string().min(SECRET_MIN_LENGTH, `precisa ter ao menos ${SECRET_MIN_LENGTH} caracteres`);

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(MAX_PORT).default(DEFAULT_PORT),
  MONGO_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, 'deve começar com mongodb:// ou mongodb+srv://'),
  JWT_SECRET: secret,
  // Formato aceito pelo jsonwebtoken: número de segundos ou número + unidade (ex.: 15m, 1d).
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+(ms|s|m|h|d|w|y)?$/, 'use segundos ou número + unidade, ex.: 15m, 1d')
    .default('1d'),
  AUDIT_SECRET: secret,
  // Lista separada por vírgula. Cada item vira só a origem (`http://host:porta`), sem barra final,
  // porque é isso que o navegador manda no header Origin.
  CORS_ORIGIN: z
    .string()
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean))
    .pipe(z.array(z.url().transform((url) => new URL(url).origin)).min(1)),
  // Quantos proxies reversos ficam na frente da API (Railway = 1). Com 0, o IP do rate limit é o da conexão;
  // acima de 0 sem proxy de verdade, qualquer cliente forjaria o próprio IP pelo X-Forwarded-For.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  SEED_ON_START: z.stringbool().default(false),
  MET_API_BASE: z.url().default('https://collectionapi.metmuseum.org/public/collection/v1'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Só o nome da variável e o motivo; nunca o valor (pode ser segredo).
  const lines = parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`);
  console.error(`Variáveis de ambiente inválidas; a API não vai subir:\n${lines.join('\n')}`);
  process.exit(1);
}

export const env = parsed.data;

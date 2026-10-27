import type { ErrorRequestHandler, RequestHandler } from 'express';
import { z } from 'zod';
import { CURRENCY, ERRORS, ErrorCode, LOCALE } from './constants.js';

type ErrorBody = { error: { code: ErrorCode; message: string; details?: Record<string, unknown> } };

const brl = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY });

/** Centavos em reais: 105000 → "R$ 1.050,00". */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/** Troca cada `{campo}` da mensagem pelo valor de `details.campo` (centavos) em R$. */
function fillMessage(template: string, details?: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) => {
    const value = details?.[key];
    return typeof value === 'number' ? formatBRL(value) : placeholder;
  });
}

/** Erro de negócio: o handler central traduz `code` em status HTTP e mensagem pt-BR. */
export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    readonly details?: Record<string, unknown>,
  ) {
    super(fillMessage(ERRORS[code].message, details));
    this.name = 'AppError';
    this.status = ERRORS[code].status;
  }
}

function body(code: ErrorCode, details?: Record<string, unknown>, message: string = ERRORS[code].message): ErrorBody {
  return { error: { code, message, ...(details && { details }) } };
}

/** Primeira mensagem de cada campo: `{ "email": "...", "wallet.balance": "..." }`. */
function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    fields[key] ??= issue.message;
  }
  return fields;
}

/** Erros 4xx do body-parser (JSON malformado, corpo grande demais) trazem `status` e `expose`. */
function isClientHttpError(err: unknown): boolean {
  if (!(err instanceof Error) || !('status' in err) || !('expose' in err)) return false;
  return typeof err.status === 'number' && err.status >= 400 && err.status < 500 && err.expose === true;
}

/** Mesmo formato do handler HTTP, para quem responde fora dele (ack do socket). */
export function errorBodyOf(err: unknown): ErrorBody {
  if (err instanceof AppError) return body(err.code, err.details, err.message);
  return body(ErrorCode.INTERNAL_ERROR);
}

export const notFoundHandler: RequestHandler = () => {
  throw new AppError(ErrorCode.NOT_FOUND);
};

// Express só reconhece o handler de erro pela aridade 4, por isso o `_next`.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json(body(err.code, err.details, err.message));
    return;
  }
  if (err instanceof z.ZodError) {
    res.status(ERRORS.VALIDATION_ERROR.status).json(body(ErrorCode.VALIDATION_ERROR, { fields: fieldErrors(err) }));
    return;
  }
  if (isClientHttpError(err)) {
    res.status(ERRORS.VALIDATION_ERROR.status).json(body(ErrorCode.VALIDATION_ERROR));
    return;
  }
  // Nunca logar body, headers ou query: podem ter senha, token ou e-mail.
  console.error(`[erro] ${req.method} ${req.path}`, err instanceof Error ? err.stack : err);
  res.status(ERRORS.INTERNAL_ERROR.status).json(body(ErrorCode.INTERNAL_ERROR));
};

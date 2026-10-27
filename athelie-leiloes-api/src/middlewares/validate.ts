import type { RequestHandler } from 'express';
import { z, type ZodType } from 'zod';
import { ErrorCode } from '../constants.js';
import { AppError } from '../errors.js';

type Schemas = { body?: ZodType; query?: ZodType; params?: ZodType };

/** ObjectId do Mongo (24 hex). */
export const objectId = z.string().regex(/^[a-f\d]{24}$/i);
/** `:id` das rotas. */
export const idParams = z.object({ id: objectId });
export type IdParams = z.infer<typeof idParams>;

/**
 * Valida e substitui body, query e params pelo resultado do parse (com trims e coerções aplicados).
 * Body e query inválidos viram VALIDATION_ERROR (pelo handler central). Params inválidos viram NOT_FOUND:
 * nesta API o params é sempre um identificador, e um id malformado é um recurso que não existe.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    if (schemas.params) {
      const params = schemas.params.safeParse(req.params);
      if (!params.success) throw new AppError(ErrorCode.NOT_FOUND);
      req.params = params.data as typeof req.params;
    }
    if (schemas.query) {
      // No Express 5, req.query é um getter; a propriedade própria passa a ter precedência.
      Object.defineProperty(req, 'query', { value: schemas.query.parse(req.query), enumerable: true });
    }
    // Sem corpo JSON o Express deixa body undefined; `{}` faz os erros saírem por campo.
    if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
    next();
  };
}

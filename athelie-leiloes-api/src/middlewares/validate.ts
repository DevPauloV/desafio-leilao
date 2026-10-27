import type { RequestHandler } from 'express';
import { z, type ZodType } from 'zod';
import { ErrorCode } from '../constants.js';
import { AppError } from '../errors.js';

type Schemas = { body?: ZodType; query?: ZodType; params?: ZodType };

export const objectId = z.string().regex(/^[a-f\d]{24}$/i);
export const idParams = z.object({ id: objectId });
export type IdParams = z.infer<typeof idParams>;

/** Params inválidos viram NOT_FOUND: aqui params é sempre um id, e id malformado é recurso inexistente. */
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

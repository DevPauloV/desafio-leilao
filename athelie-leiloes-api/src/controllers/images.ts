import type { Request, Response } from 'express';
import type { IdParams } from '../middlewares/validate.js';
import { getImage } from '../services/images.js';

export async function get(req: Request<IdParams>, res: Response): Promise<void> {
  const image = await getImage(req.params.id);
  res
    .set({
      'Content-Type': image.contentType,
      // A imagem de um id nunca muda.
      'Cache-Control': 'public, max-age=31536000, immutable',
      // O helmet põe same-origin por padrão; o front roda em outra origem.
      'Cross-Origin-Resource-Policy': 'cross-origin',
    })
    .send(image.data);
}

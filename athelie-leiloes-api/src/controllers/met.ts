import type { Request, Response } from 'express';
import * as met from '../services/met.js';
import type { MetSearchQuery } from '../services/met.js';

export async function search(req: Request<unknown, unknown, unknown, MetSearchQuery>, res: Response): Promise<void> {
  const artworks = await met.searchArtworks(req.query.q);
  res.json({
    items: artworks.map(({ imageUrl, ...artwork }) => ({ ...artwork, previewUrl: imageUrl })),
  });
}

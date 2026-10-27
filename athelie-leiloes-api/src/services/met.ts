import { z } from 'zod';
import { env } from '../config/env.js';
import {
  ErrorCode,
  MAX_IMAGE_BYTES,
  MET_CONCURRENCY,
  MET_QUERY_MAX_LENGTH,
  MET_RETRIES,
  MET_SEARCH_CANDIDATES,
  MET_SEARCH_LIMIT,
  MET_TIMEOUT_MS,
} from '../constants.js';
import { AppError } from '../errors.js';

// O Met às vezes bloqueia requisições sem User-Agent.
const HEADERS = { 'User-Agent': 'AthelieLeiloes/0.1 (teste tecnico; leilao de obras do Met)' };
// SVG fica de fora: pode carregar script.
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// A busca mudou para /v1.1/search; os objetos seguem em /v1 (MET_API_BASE).
const searchUrl = () => new URL('../v1.1/search', `${env.MET_API_BASE}/`);
const objectUrl = (id: number) => `${env.MET_API_BASE}/objects/${id}`;

// O Met manda "" quando o campo falta.
const text = z
  .string()
  .nullish()
  .transform((value) => value?.trim() || null);

const searchSchema = z.object({ objectIDs: z.array(z.number().int()).nullable() });

const objectSchema = z.object({
  objectID: z.number().int().positive(),
  isPublicDomain: z.boolean(),
  primaryImageSmall: z.string(),
  title: text,
  artistDisplayName: text,
  objectDate: text,
  medium: text,
  department: text,
  objectURL: text,
});

// Contra SSRF: só baixa por https de host do Met.
const metImageUrl = z.url({ protocol: /^https$/, hostname: /(^|\.)metmuseum\.org$/ });

export const metSearchQuery = z.object({ q: z.string().trim().min(1).max(MET_QUERY_MAX_LENGTH) });
export type MetSearchQuery = z.infer<typeof metSearchQuery>;

export type Artwork = {
  metObjectId: number;
  title: string;
  artist: string | null;
  date: string | null;
  medium: string | null;
  department: string | null;
  metUrl: string | null;
  imageUrl: string;
};

export type DownloadedImage = { data: Buffer; contentType: string };

async function metGet<T>(url: string | URL, read: (res: Response) => Promise<T>): Promise<T | null> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(MET_TIMEOUT_MS) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Met respondeu ${res.status}`);
      return await read(res);
    } catch (err) {
      if (attempt >= MET_RETRIES) {
        console.warn(`[met] falha em ${new URL(url).pathname}:`, err instanceof Error ? err.message : err);
        throw new AppError(ErrorCode.EXTERNAL_API_UNAVAILABLE);
      }
    }
  }
}

function toArtwork(raw: z.infer<typeof objectSchema>): Artwork | null {
  if (!raw.isPublicDomain || !raw.title || !metImageUrl.safeParse(raw.primaryImageSmall).success) return null;
  return {
    metObjectId: raw.objectID,
    title: raw.title,
    artist: raw.artistDisplayName,
    date: raw.objectDate,
    medium: raw.medium,
    department: raw.department,
    metUrl: raw.objectURL,
    imageUrl: raw.primaryImageSmall,
  };
}

export async function fetchObject(id: number): Promise<Artwork | null> {
  const raw = await metGet(objectUrl(id), (res) => res.json());
  if (raw === null) return null;
  const parsed = objectSchema.safeParse(raw);
  return parsed.success ? toArtwork(parsed.data) : null;
}

export async function searchArtworks(q: string): Promise<Artwork[]> {
  const url = searchUrl();
  url.search = new URLSearchParams({ q, hasImages: 'true', limit: String(MET_SEARCH_CANDIDATES) }).toString();
  const raw = await metGet(url, (res) => res.json());
  const parsed = searchSchema.safeParse(raw);
  if (raw !== null && !parsed.success) throw new AppError(ErrorCode.EXTERNAL_API_UNAVAILABLE);
  const ids = (parsed.data?.objectIDs ?? []).slice(0, MET_SEARCH_CANDIDATES);

  const artworks: Artwork[] = [];
  // Impressões da mesma gravura têm ids diferentes no Met.
  const seen = new Set<string>();
  const isNew = (artwork: Artwork) => {
    const key = JSON.stringify([artwork.title, artwork.artist, artwork.date]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
  let consulted = 0;
  let failed = 0;
  const fetchOrSkip = (id: number) =>
    fetchObject(id).catch((err: unknown) => {
      if (!(err instanceof AppError)) throw err;
      failed += 1;
      return null;
    });
  for (let i = 0; i < ids.length && artworks.length < MET_SEARCH_LIMIT; i += MET_CONCURRENCY) {
    const batchIds = ids.slice(i, i + MET_CONCURRENCY);
    consulted += batchIds.length;
    const batch = await Promise.all(batchIds.map(fetchOrSkip));
    artworks.push(...batch.filter((artwork) => artwork !== null).filter(isNew));
  }
  if (consulted > 0 && failed === consulted) throw new AppError(ErrorCode.EXTERNAL_API_UNAVAILABLE);
  return artworks.slice(0, MET_SEARCH_LIMIT);
}

export async function downloadImage(url: string): Promise<DownloadedImage | null> {
  if (!metImageUrl.safeParse(url).success) return null;
  return metGet(url, async (res) => {
    const contentType = res.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '';
    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) return null;
    if (Number(res.headers.get('content-length')) > MAX_IMAGE_BYTES) return null;
    const data = Buffer.from(await res.arrayBuffer());
    if (data.length === 0 || data.length > MAX_IMAGE_BYTES) return null;
    return { data, contentType };
  });
}

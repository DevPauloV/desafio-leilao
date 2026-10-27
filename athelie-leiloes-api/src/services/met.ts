// Único ponto de contato com o Met (ADR 0004). Só a busca do painel e a criação de lote passam por aqui.
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
// Formatos que o navegador exibe como imagem sem executar nada (SVG fica de fora).
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// O /v1/search foi aposentado em 2026-10-01; a busca agora é /v1.1/search (com `limit`).
// Os detalhes de obra continuam em /v1/objects, que é o MET_API_BASE.
const searchUrl = () => new URL('../v1.1/search', `${env.MET_API_BASE}/`);
const objectUrl = (id: number) => `${env.MET_API_BASE}/objects/${id}`;

/** Campo de texto do Met: vem "" quando falta; vira null. */
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

// A imagem só é baixada de um host do próprio Met, por https.
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
  /** `primaryImageSmall` do Met. */
  imageUrl: string;
};

export type DownloadedImage = { data: Buffer; contentType: string };

/**
 * GET no Met com timeout e retry. Devolve `null` para 404.
 * Rede, timeout, 4xx (exceto 404) e 5xx viram EXTERNAL_API_UNAVAILABLE depois de MET_RETRIES novas tentativas.
 */
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

/** Obra utilizável num lote: domínio público (imagem CC0), com título e imagem hospedada no Met. */
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

/** Obra pelo id; `null` se não existe ou não pode ir a leilão. */
export async function fetchObject(id: number): Promise<Artwork | null> {
  const raw = await metGet(objectUrl(id), (res) => res.json());
  if (raw === null) return null;
  const parsed = objectSchema.safeParse(raw);
  return parsed.success ? toArtwork(parsed.data) : null;
}

/**
 * Até MET_SEARCH_LIMIT obras utilizáveis, na ordem de relevância do Met.
 * Obra que falha (rede, timeout, 5xx) é descartada como as inválidas. Só responde EXTERNAL_API_UNAVAILABLE
 * se a busca falhar ou se todas as obras consultadas falharem.
 */
export async function searchArtworks(q: string): Promise<Artwork[]> {
  const url = searchUrl();
  url.search = new URLSearchParams({ q, hasImages: 'true', limit: String(MET_SEARCH_CANDIDATES) }).toString();
  const raw = await metGet(url, (res) => res.json());
  const parsed = searchSchema.safeParse(raw);
  if (raw !== null && !parsed.success) throw new AppError(ErrorCode.EXTERNAL_API_UNAVAILABLE); // formato inesperado
  const ids = (parsed.data?.objectIDs ?? []).slice(0, MET_SEARCH_CANDIDATES);

  const artworks: Artwork[] = [];
  let consulted = 0;
  let failed = 0;
  const fetchOrSkip = (id: number) =>
    fetchObject(id).catch((err: unknown) => {
      if (!(err instanceof AppError)) throw err;
      failed += 1;
      return null;
    });
  // Alguns ids por vez, parando assim que juntar obras suficientes.
  for (let i = 0; i < ids.length && artworks.length < MET_SEARCH_LIMIT; i += MET_CONCURRENCY) {
    const batchIds = ids.slice(i, i + MET_CONCURRENCY);
    consulted += batchIds.length;
    const batch = await Promise.all(batchIds.map(fetchOrSkip));
    artworks.push(...batch.filter((artwork) => artwork !== null));
  }
  if (consulted > 0 && failed === consulted) throw new AppError(ErrorCode.EXTERNAL_API_UNAVAILABLE);
  return artworks.slice(0, MET_SEARCH_LIMIT);
}

/** Bytes da imagem; `null` se não existe, não é um formato aceito ou passa de MAX_IMAGE_BYTES. */
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

import { ErrorCode, STORAGE_KEYS } from '@/constants';

// URL da API vista pelo navegador. Entra no build (Dockerfile); sem ela, o dev aponta para a API local.
export const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000').replace(/\/+$/, '');

/** Erro no formato do contrato. `message` vem pronta em pt-BR e é exibida como está; `code` serve só para lógica. */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  /** Mensagem por campo, quando a API recusa a validação (`details.fields`). */
  readonly fields: Record<string, string>;

  constructor(code: ErrorCode, message: string, status: number, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

const NETWORK_ERROR_MESSAGE = 'Não foi possível falar com o servidor. Confira sua conexão e tente de novo.';

/** Mensagem para exibir de qualquer erro capturado. */
export function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE;
}

// O localStorage pode estar bloqueado (modo privado, política do navegador): nesse caso a sessão dura só a aba.
let memoryToken: string | null = null;

export function getToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch {
    return memoryToken;
  }
}

export function setToken(token: string | null): void {
  memoryToken = token;
  try {
    if (token) localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    else localStorage.removeItem(STORAGE_KEYS.TOKEN);
  } catch {
    // fica só em memória
  }
}

/** A API devolve imagens como caminho relativo ("/api/images/<id>"); URLs absolutas (prévia do Met) passam direto. */
export function assetUrl(path: string): string {
  return /^https?:\/\//.test(path) ? path : `${API_URL}${path}`;
}

type ErrorBody = { error?: { code?: ErrorCode; message?: string; details?: { fields?: Record<string, string> } } };

export async function api<T>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_URL}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: init.signal,
  });

  const data: unknown = await response.json().catch(() => null);
  if (response.ok) return data as T;

  const error = (data as ErrorBody | null)?.error;
  throw new ApiError(
    error?.code ?? ErrorCode.INTERNAL_ERROR,
    error?.message ?? NETWORK_ERROR_MESSAGE,
    response.status,
    error?.details?.fields,
  );
}

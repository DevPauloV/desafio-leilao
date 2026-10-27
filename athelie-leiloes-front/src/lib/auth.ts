import { useSyncExternalStore } from 'react';
import { ROUTE_ROLES, ROUTES, Role } from '@/constants';
import type { AuthResponse, User } from '@/types';
import { ApiError, api, getToken, setToken } from './api';
import { reconnectSocket } from './socket';
import { setWallet } from './wallet';

// Sessão do usuário num store simples: o app inteiro lê com useAuth(), sem provider.

type AuthState = { user: User | null; loading: boolean };

let state: AuthState = { user: null, loading: getToken() !== null };
const listeners = new Set<() => void>();

function set(next: AuthState) {
  state = next;
  listeners.forEach((listener) => listener());
}

/** Ao abrir o app: confirma o token salvo com GET /api/auth/me. */
export async function loadSession(): Promise<void> {
  if (!getToken()) return;
  try {
    const { user } = await api<{ user: User }>('/api/auth/me');
    set({ user, loading: false });
  } catch (err) {
    // Token vencido ou de usuário removido: descarta. Falha de rede mantém o token para a próxima tentativa.
    if (err instanceof ApiError && err.status === 401) {
      setToken(null);
      reconnectSocket();
    }
    set({ user: null, loading: false });
  }
}

async function start(path: string, body: unknown): Promise<User> {
  const { token, user } = await api<AuthResponse>(path, { method: 'POST', body });
  setToken(token);
  set({ user, loading: false });
  reconnectSocket();
  return user;
}

export const login = (input: { email: string; password: string }) => start('/api/auth/login', input);

export const register = (input: { name: string; email: string; password: string; role: Role }) =>
  start('/api/auth/register', input);

/**
 * Para onde ir depois de entrar: a página que pediu login, se o papel puder abri-la; senão, a tela principal do papel.
 * Sem a checagem, uma conta nova de licitante caía no painel do leiloeiro que a sessão anterior tinha aberto.
 */
export function homeFor(role: Role, from?: string): string {
  const required = from ? (ROUTE_ROLES as Record<string, Role | undefined>)[from] : undefined;
  if (from && (required === undefined || required === role)) return from;
  return role === Role.AUCTIONEER ? ROUTES.AUCTIONEER_PANEL : ROUTES.SHOWCASE;
}

export function logout(): void {
  setToken(null);
  setWallet(null);
  reconnectSocket();
  set({ user: null, loading: false });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, () => state);
}

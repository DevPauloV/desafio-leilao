import { useSyncExternalStore } from 'react';
import { ROUTE_ROLES, ROUTES, Role } from '@/constants';
import type { AuthResponse, User } from '@/types';
import { ApiError, api, getToken, setToken } from './api';
import { clearPageCache } from './loading';
import { reconnectSocket } from './socket';
import { setWallet } from './wallet';

type AuthState = { user: User | null; loading: boolean };

let state: AuthState = { user: null, loading: getToken() !== null };
const listeners = new Set<() => void>();

function set(next: AuthState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export async function loadSession(): Promise<void> {
  if (!getToken()) return;
  try {
    const { user } = await api<{ user: User }>('/api/auth/me');
    set({ user, loading: false });
  } catch (err) {
    // Só 401 descarta o token; falha de rede o mantém para a próxima tentativa.
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
  clearPageCache();
  set({ user, loading: false });
  reconnectSocket();
  return user;
}

export const login = (input: { email: string; password: string }) => start('/api/auth/login', input);

export const register = (input: { name: string; email: string; password: string; role: Role }) =>
  start('/api/auth/register', input);

/** Checa o papel de `from`: sem isso, um licitante novo caía no painel aberto pela sessão anterior. */
export function homeFor(role: Role, from?: string): string {
  const required = from ? (ROUTE_ROLES as Record<string, Role | undefined>)[from] : undefined;
  if (from && (required === undefined || required === role)) return from;
  return role === Role.AUCTIONEER ? ROUTES.AUCTIONEER_PANEL : ROUTES.SHOWCASE;
}

export function logout(): void {
  setToken(null);
  setWallet(null);
  clearPageCache();
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

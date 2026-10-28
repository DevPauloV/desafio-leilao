import { io } from 'socket.io-client';
import { API_URL, getToken } from './api';

// `auth` como função: o token é relido a cada (re)conexão, então basta reconectar ao entrar ou sair.
// Só WebSocket: na Vercel o long-polling cairia em instâncias diferentes a cada requisição (ADR 0005).
export const socket = io(API_URL, {
  autoConnect: false,
  transports: ['websocket'],
  auth: (send) => send(getToken() ? { token: getToken() } : {}),
});

export function reconnectSocket(): void {
  socket.disconnect();
  socket.connect();
}

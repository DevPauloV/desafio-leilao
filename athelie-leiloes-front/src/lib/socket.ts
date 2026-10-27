import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { SocketEvent, lotPath } from '@/constants';
import type { BidOutbidEvent, Wallet } from '@/types';
import { API_URL, getToken } from './api';
import { formatMoney } from './money';
import { setWallet } from './wallet';

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

export function usePersonalEvents(): void {
  const navigate = useNavigate();
  useEffect(() => {
    const onOutbid = (event: BidOutbidEvent) => {
      const path = lotPath(event.lotId);
      // Na própria sala, a faixa "Você foi superado" já avisa.
      if (window.location.pathname === path) return;
      toast.warning(`Você foi superado em ${event.title}`, {
        description: `Lance atual: ${formatMoney(event.currentBid)}`,
        action: { label: 'Ir para a sala', onClick: () => navigate(path) },
      });
    };
    const onWallet = (wallet: Wallet) => setWallet(wallet);
    socket.on(SocketEvent.BID_OUTBID, onOutbid);
    socket.on(SocketEvent.WALLET_UPDATE, onWallet);
    return () => {
      socket.off(SocketEvent.BID_OUTBID, onOutbid);
      socket.off(SocketEvent.WALLET_UPDATE, onWallet);
    };
  }, [navigate]);
}

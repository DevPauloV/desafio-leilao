import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { SocketEvent, lotPath } from '@/constants';
import { formatMoney } from '@/lib/money';
import { socket } from '@/lib/socket';
import { setWallet } from '@/lib/wallet';
import type { BidOutbidEvent, Wallet } from '@/types';

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

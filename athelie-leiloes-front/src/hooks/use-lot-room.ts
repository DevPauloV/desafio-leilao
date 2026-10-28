import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ErrorCode, LotStatus, Role, SocketEvent } from '@/constants';
import { ApiError, api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { extendedToast, newerOf, withBid } from '@/lib/lot-room';
import { socket } from '@/lib/socket';
import type { BidNewEvent, BidResponse, LotCancelledEvent, LotDetail, LotEndedEvent, LotExtendedEvent } from '@/types';

export function useLotRoom(id: string) {
  const { user } = useAuth();
  const isBidder = user?.role === Role.BIDDER;
  const [reload, setReload] = useState(0);
  const [lot, setLot] = useState<LotDetail | null>(null);
  const [error, setError] = useState<{ key: string; message: string; notFound: boolean } | null>(null);
  const requestKey = `${id}:${reload}`;
  const refresh = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    api<LotDetail>(`/api/lots/${encodeURIComponent(id)}`, { signal: controller.signal }).then(
      (data) => setLot((current) => newerOf(current, data)),
      (err: unknown) => {
        if (controller.signal.aborted) return;
        const notFound = err instanceof ApiError && err.code === ErrorCode.NOT_FOUND;
        setError({ key: requestKey, message: errorMessage(err), notFound });
      },
    );
    return () => controller.abort();
  }, [id, requestKey]);

  useEffect(() => {
    const join = () => socket.emit(SocketEvent.LOT_JOIN, { lotId: id });
    const onState = (data: LotDetail) => {
      if (data.id === id) setLot((current) => newerOf(current, data));
    };
    const onBid = (event: BidNewEvent) => {
      if (event.lotId !== id) return;
      setLot((current) => current && withBid(current, event));
      if (isBidder) refresh(); // posição e total de licitantes vêm do servidor
    };
    const onExtended = (event: LotExtendedEvent) => {
      if (event.lotId !== id) return;
      setLot((current) => current && { ...current, endsAt: event.endsAt, serverTime: event.serverTime });
      extendedToast(id, event.endsAt);
    };
    const onEnded = (event: LotEndedEvent) => {
      if (event.lotId !== id) return;
      setLot(
        (current) =>
          current && {
            ...current,
            status: LotStatus.ENDED,
            result: current.result ?? {
              sold: event.winnerPseudonym !== null,
              winnerPseudonym: event.winnerPseudonym,
              amount: event.amount,
              settledAt: new Date().toISOString(),
            },
          },
      );
      refresh(); // traz o código do comprovante para o vencedor
    };
    const onCancelled = (event: LotCancelledEvent) => {
      if (event.lotId !== id) return;
      setLot((current) => current && { ...current, status: LotStatus.CANCELLED });
      toast.info('Este lote foi cancelado pelo leiloeiro.');
    };

    socket.on(SocketEvent.CONNECT, join);
    socket.on(SocketEvent.LOT_STATE, onState);
    socket.on(SocketEvent.BID_NEW, onBid);
    socket.on(SocketEvent.LOT_EXTENDED, onExtended);
    socket.on(SocketEvent.LOT_ENDED, onEnded);
    socket.on(SocketEvent.LOT_CANCELLED, onCancelled);
    if (socket.connected) join();
    return () => {
      socket.emit(SocketEvent.LOT_LEAVE, { lotId: id });
      socket.off(SocketEvent.CONNECT, join);
      socket.off(SocketEvent.LOT_STATE, onState);
      socket.off(SocketEvent.BID_NEW, onBid);
      socket.off(SocketEvent.LOT_EXTENDED, onExtended);
      socket.off(SocketEvent.LOT_ENDED, onEnded);
      socket.off(SocketEvent.LOT_CANCELLED, onCancelled);
    };
  }, [id, isBidder, refresh]);

  const applyOwnBid = useCallback((response: BidResponse) => {
    setLot((current) => current && withBid(current, { ...response, bidCount: response.bid.seq }));
  }, []);

  return {
    lot: lot?.id === id ? lot : null,
    error: error?.key === requestKey ? error : null,
    refresh,
    applyOwnBid,
  };
}

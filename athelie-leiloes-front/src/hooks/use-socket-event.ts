import { useEffect } from 'react';
import type { SocketEvent } from '@/constants';
import { socket } from '@/lib/socket';

/** `handler` precisa ser estável (useCallback), senão a assinatura é refeita a cada render. */
export function useSocketEvent<T>(event: SocketEvent, handler: (payload: T) => void): void {
  useEffect(() => {
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [event, handler]);
}

import { useState } from 'react';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import type { MyLot } from '@/types';

/** Estado do cancelamento, compartilhado pela lista "ao vivo" e pela tabela: ambas pedem o mesmo modal. */
export function useCancelLot(onChanged: () => void) {
  const [confirming, setConfirming] = useState<MyLot | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Fecha o modal também no erro (ex.: o lote encerrou enquanto ele estava aberto); o toast explica e a lista é relida.
  async function confirm(lot: MyLot) {
    setCancelling(true);
    try {
      const { refunded } = await api<{ refunded: boolean }>(`/api/lots/${lot.id}/cancel`, { method: 'POST' });
      toast.success(refunded ? 'Lote cancelado e lance estornado' : 'Lote cancelado', { description: lot.title });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCancelling(false);
      setConfirming(null);
      onChanged();
    }
  }

  return { confirming, cancelling, ask: setConfirming, confirm, close: () => setConfirming(null) };
}

import { useContext, useEffect } from 'react';
import { CrumbLotContext } from '@/lib/crumb-lot';

/** Lote atual da página (sala, auditoria, comprovante), para o breadcrumb mostrar o título da obra. */
export const useCrumbLotValue = () => useContext(CrumbLotContext).lot;

export function useCrumbLot(id: string | undefined, title: string | undefined) {
  const { setLot } = useContext(CrumbLotContext);
  useEffect(() => {
    if (!id || !title) return;
    setLot({ id, title });
    return () => setLot(null);
  }, [id, title, setLot]);
}

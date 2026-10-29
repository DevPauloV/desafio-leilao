import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type CrumbLot = { id: string; title: string };

type CrumbLotState = { lot: CrumbLot | null; setLot: (lot: CrumbLot | null) => void };

const CrumbLotContext = createContext<CrumbLotState>({ lot: null, setLot: () => {} });

export function CrumbLotProvider({ children }: { children: ReactNode }) {
  const [lot, setLot] = useState<CrumbLot | null>(null);
  return <CrumbLotContext.Provider value={{ lot, setLot }}>{children}</CrumbLotContext.Provider>;
}

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

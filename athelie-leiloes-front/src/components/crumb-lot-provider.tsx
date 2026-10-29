import { useState, type ReactNode } from 'react';
import { CrumbLotContext, type CrumbLot } from '@/lib/crumb-lot';

export function CrumbLotProvider({ children }: { children: ReactNode }) {
  const [lot, setLot] = useState<CrumbLot | null>(null);
  return <CrumbLotContext.Provider value={{ lot, setLot }}>{children}</CrumbLotContext.Provider>;
}

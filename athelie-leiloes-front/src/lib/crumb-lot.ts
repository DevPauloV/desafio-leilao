import { createContext } from 'react';

export type CrumbLot = { id: string; title: string };

type CrumbLotState = { lot: CrumbLot | null; setLot: (lot: CrumbLot | null) => void };

export const CrumbLotContext = createContext<CrumbLotState>({ lot: null, setLot: () => {} });

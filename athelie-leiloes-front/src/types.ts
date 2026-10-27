// Tipos das respostas da API (docs/contract.md, seção 6). Dinheiro em centavos; datas em ISO 8601.
import type { AuditProblem, LotStatus, MyBidStatus, Role } from '@/constants';

export type User = { id: string; name: string; email: string; role: Role };

export type AuthResponse = { token: string; user: User };

export type LotSummary = {
  id: string;
  title: string;
  artist: string | null;
  date: string | null;
  medium: string | null;
  /** Caminho relativo à API ("/api/images/<id>"). */
  imageUrl: string;
  status: LotStatus;
  startsAt: string;
  endsAt: string;
  startingBid: number;
  currentBid: number | null;
  bidCount: number;
  department: string | null;
};

/** `departments`: departamentos dos lotes visíveis, para o seletor da vitrine (não depende dos filtros). */
export type LotPage = { items: LotSummary[]; page: number; total: number; serverTime: string; departments: string[] };

export type MyLot = LotSummary & { result: { sold: boolean; amount: number | null } | null };

export type MyLotsResponse = { items: MyLot[]; totalReceived: number; serverTime: string };

export type MetArtwork = {
  metObjectId: number;
  title: string;
  artist: string | null;
  date: string | null;
  medium: string | null;
  department: string | null;
  previewUrl: string;
  metUrl: string | null;
};

export type CreateLotInput = {
  metObjectId: number;
  startingBid: number;
  minIncrement: number;
  startsAt: string;
  endsAt: string;
};

export type BidView = { seq: number; pseudonym: string; amount: number; createdAt: string };

export type LotDetail = LotSummary & {
  item: {
    title: string;
    artist: string | null;
    date: string | null;
    medium: string | null;
    department: string | null;
    metUrl: string | null;
    imageUrl: string;
  };
  minIncrement: number;
  minimumNextBid: number;
  serverTime: string;
  /** Mais recente primeiro, até 50. */
  bids: BidView[];
  /** Só com token de licitante. `position` é null enquanto ele não deu lance. */
  /** `receiptCode` só para o vencedor de lote liquidado. */
  me?: { pseudonym: string; isLeader: boolean; position: number | null; totalBidders: number; receiptCode?: string };
  /** Só em lote liquidado; público, sem ids. */
  result?: { sold: boolean; winnerPseudonym: string | null; amount: number | null; settledAt: string };
};

export type BidResponse = { bid: BidView; currentBid: number; minimumNextBid: number; endsAt: string; extended: boolean };

export type Wallet = {
  balance: number;
  committed: number;
  available: number;
  /** Lotes ativos em que o usuário lidera (soma = comprometido). */
  leading: { lotId: string; title: string; amount: number; endsAt: string }[];
};

export type ReceiptView = {
  code: string;
  lot: {
    id: string;
    title: string;
    artist: string | null;
    date: string | null;
    medium: string | null;
    department: string | null;
    imageUrl: string;
    metUrl: string | null;
  };
  winnerPseudonym: string;
  amount: number;
  settledAt: string;
  chainHash: string;
};

// Eventos Socket.IO (docs/contract.md, seção 7).
export type BidNewEvent = {
  lotId: string;
  bid: BidView;
  currentBid: number;
  minimumNextBid: number;
  endsAt: string;
  bidCount: number;
  serverTime: string;
};
export type LotExtendedEvent = { lotId: string; endsAt: string; serverTime: string };
export type LotEndedEvent = { lotId: string; winnerPseudonym: string | null; amount: number | null };
export type LotCancelledEvent = { lotId: string };
export type BidOutbidEvent = { lotId: string; title: string; currentBid: number };

export type AuditView = {
  lot: { id: string; title: string; artist: string | null; imageUrl: string; status: LotStatus; startsAt: string; endsAt: string };
  /** Em ordem de `seq`. */
  bids: (BidView & { prevHash: string; hash: string; valid: boolean })[];
  verdict: { intact: boolean; firstInvalidSeq?: number; problem?: AuditProblem };
  checkedAt: string;
};

export type MyBidItem = { lot: LotSummary; myHighestBid: number; myStatus: MyBidStatus; receiptCode?: string };

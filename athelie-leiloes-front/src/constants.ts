// Espelho das constantes da API que o front usa (docs/contract.md, seções 1 e 2).
// Nenhum destes valores aparece como string solta no código.

type ValueOf<T> = T[keyof T];

export const Role = { AUCTIONEER: 'auctioneer', BIDDER: 'bidder' } as const;
export type Role = ValueOf<typeof Role>;
export const ROLE_LABELS: Record<Role, string> = { [Role.AUCTIONEER]: 'Leiloeiro', [Role.BIDDER]: 'Licitante' };

/** Calculado pela API a partir do estado do lote e do horário do servidor. */
export const LotStatus = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  ENDED: 'ended',
  CANCELLED: 'cancelled',
} as const;
export type LotStatus = ValueOf<typeof LotStatus>;

/** Situação do licitante em cada lote de GET /api/me/bids. */
export const MyBidStatus = {
  WINNING: 'winning',
  OUTBID: 'outbid',
  WON: 'won',
  LOST: 'lost',
  CANCELLED: 'cancelled',
} as const;
export type MyBidStatus = ValueOf<typeof MyBidStatus>;

/** Problema encontrado pela auditoria (o primeiro da cadeia). */
export const AuditProblem = {
  ALTERED: 'altered',
  MISSING: 'missing',
  INSERTED: 'inserted',
  HEAD_MISMATCH: 'head_mismatch',
} as const;
export type AuditProblem = ValueOf<typeof AuditProblem>;

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  FORBIDDEN: 'FORBIDDEN',
  AUCTIONEER_CANNOT_BID: 'AUCTIONEER_CANNOT_BID',
  NOT_FOUND: 'NOT_FOUND',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  LOT_NOT_STARTED: 'LOT_NOT_STARTED',
  LOT_ENDED: 'LOT_ENDED',
  LOT_CANCELLED: 'LOT_CANCELLED',
  ALREADY_WINNING: 'ALREADY_WINNING',
  BID_TOO_LOW: 'BID_TOO_LOW',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  RATE_LIMITED: 'RATE_LIMITED',
  EXTERNAL_API_UNAVAILABLE: 'EXTERNAL_API_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ErrorCode = ValueOf<typeof ErrorCode>;

/** Eventos Socket.IO (docs/contract.md, seção 7). */
export const SocketEvent = {
  /** Evento do próprio Socket.IO, a cada conexão e reconexão. */
  CONNECT: 'connect',
  LOT_JOIN: 'lot:join',
  LOT_LEAVE: 'lot:leave',
  LOT_STATE: 'lot:state',
  BID_NEW: 'bid:new',
  LOT_EXTENDED: 'lot:extended',
  LOT_ENDED: 'lot:ended',
  LOT_CANCELLED: 'lot:cancelled',
  BID_OUTBID: 'bid:outbid',
  WALLET_UPDATE: 'wallet:update',
} as const;

// Números de regra da API usados na interface.
export const ANTI_SNIPING_WINDOW_MS = 120_000;
export const ANTI_SNIPING_EXTENSION_MS = 120_000;
/** Teto por depósito, em centavos (R$ 100.000,00). */
export const MAX_DEPOSIT = 10_000_000;

/** Lotes por página em GET /api/lots (definido pela API). */
export const LOTS_PAGE_SIZE = 12;
/** Tamanho máximo do termo de busca em GET /api/lots (`q`). */
export const SEARCH_MAX_LENGTH = 80;
/** Lances mais recentes que a API manda no detalhe do lote (LOT_DETAIL_BIDS_LIMIT na API). */
export const LOT_DETAIL_BIDS_LIMIT = 50;
/** Idioma e moeda de toda formatação de data e dinheiro (Intl). */
export const LOCALE = 'pt-BR';
export const CURRENCY = 'BRL';
/** Tamanho máximo do termo de busca de obras no painel, em GET /api/met/search (`q`). */
export const MET_QUERY_MAX_LENGTH = 100;
/** Cadastro: os mesmos limites que a API valida (contrato, seção 1). */
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 80;
export const PASSWORD_MIN_LENGTH = 8;

/** Rotas das telas. */
export const ROUTES = {
  SHOWCASE: '/',
  LOGIN: '/entrar',
  REGISTER: '/criar-conta',
  AUCTIONEER_PANEL: '/painel',
  LOT: '/lotes/:id',
  WALLET: '/carteira',
  MY_BIDS: '/arremates',
  RECEIPT: '/r/:code',
  AUDIT: '/auditoria/:id',
} as const;

/** Telas de um papel só. Fonte única para a proteção das rotas e para o redirecionamento depois do login. */
export const ROUTE_ROLES = {
  [ROUTES.AUCTIONEER_PANEL]: Role.AUCTIONEER,
  [ROUTES.WALLET]: Role.BIDDER,
  [ROUTES.MY_BIDS]: Role.BIDDER,
} as const satisfies Record<string, Role>;

export const lotPath = (id: string) => ROUTES.LOT.replace(':id', encodeURIComponent(id));
export const receiptPath = (code: string) => ROUTES.RECEIPT.replace(':code', encodeURIComponent(code));
export const auditPath = (id: string) => ROUTES.AUDIT.replace(':id', encodeURIComponent(id));

/** Campo de depósito da carteira: o atalho "Depositar" do cabeçalho leva até ele já focado. */
export const DEPOSIT_FIELD_ID = 'deposit';
export const DEPOSIT_PATH = `${ROUTES.WALLET}#${DEPOSIT_FIELD_ID}`;

/** Chaves do localStorage. */
export const STORAGE_KEYS = { TOKEN: 'athelie:token', THEME: 'athelie:theme' } as const;

export const Theme = { SYSTEM: 'system', LIGHT: 'light', DARK: 'dark' } as const;
export type Theme = ValueOf<typeof Theme>;

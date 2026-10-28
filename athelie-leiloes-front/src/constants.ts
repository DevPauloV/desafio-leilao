type ValueOf<T> = T[keyof T];

export const Role = { AUCTIONEER: 'auctioneer', BIDDER: 'bidder' } as const;
export type Role = ValueOf<typeof Role>;
export const ROLE_LABELS: Record<Role, string> = { [Role.AUCTIONEER]: 'Leiloeiro', [Role.BIDDER]: 'Licitante' };

export const LotStatus = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  ENDED: 'ended',
  CANCELLED: 'cancelled',
} as const;
export type LotStatus = ValueOf<typeof LotStatus>;

export const MyBidStatus = {
  WINNING: 'winning',
  OUTBID: 'outbid',
  WON: 'won',
  LOST: 'lost',
  CANCELLED: 'cancelled',
} as const;
export type MyBidStatus = ValueOf<typeof MyBidStatus>;

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

export const SocketEvent = {
  /** Nativo do Socket.IO (não é do contrato): dispara também a cada reconexão. */
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
export type SocketEvent = ValueOf<typeof SocketEvent>;

export const ANTI_SNIPING_WINDOW_MS = 120_000;
export const ANTI_SNIPING_EXTENSION_MS = 120_000;
export const MAX_DEPOSIT = 10_000_000;

export const LOTS_PAGE_SIZE = 12;
export const SEARCH_MAX_LENGTH = 80;
export const LOT_DETAIL_BIDS_LIMIT = 50;
export const LOCALE = 'pt-BR';
export const CURRENCY = 'BRL';
export const MET_QUERY_MAX_LENGTH = 100;
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 80;
export const PASSWORD_MIN_LENGTH = 8;

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

export const ROUTE_ROLES = {
  [ROUTES.AUCTIONEER_PANEL]: Role.AUCTIONEER,
  [ROUTES.WALLET]: Role.BIDDER,
  [ROUTES.MY_BIDS]: Role.BIDDER,
} as const satisfies Record<string, Role>;

export const lotPath = (id: string) => ROUTES.LOT.replace(':id', encodeURIComponent(id));
export const receiptPath = (code: string) => ROUTES.RECEIPT.replace(':code', encodeURIComponent(code));
export const auditPath = (id: string) => ROUTES.AUDIT.replace(':id', encodeURIComponent(id));

export const DEPOSIT_FIELD_ID = 'deposit';
export const DEPOSIT_PATH = `${ROUTES.WALLET}#${DEPOSIT_FIELD_ID}`;

export const STORAGE_KEYS = { TOKEN: 'athelie:token', THEME: 'athelie:theme' } as const;

export const Theme = { SYSTEM: 'system', LIGHT: 'light', DARK: 'dark' } as const;
export type Theme = ValueOf<typeof Theme>;

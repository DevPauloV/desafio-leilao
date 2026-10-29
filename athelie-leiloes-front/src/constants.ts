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

/** O que mexeu na carteira (mesmos valores da API). */
export const EntryType = { DEPOSIT: 'deposit', HOLD: 'hold', RELEASE: 'release', WIN: 'win', REFUND: 'refund' } as const;
export type EntryType = ValueOf<typeof EntryType>;

export const EntryFilter = { ALL: 'all', DEPOSITS: 'deposits', BIDS: 'bids', WINS: 'wins', CANCELLATIONS: 'cancellations' } as const;
export type EntryFilter = ValueOf<typeof EntryFilter>;

export const EntryPeriod = { WEEK: '7d', ALL: 'all' } as const;
export type EntryPeriod = ValueOf<typeof EntryPeriod>;

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

/** Janelas do filtro de período da vitrine (mesmos valores da API). */
export const LotPeriod = { DAY: '24h', WEEK: '7d', MONTH: '30d' } as const;
export type LotPeriod = ValueOf<typeof LotPeriod>;
export const LOT_DETAIL_BIDS_LIMIT = 50;
/** Lances à mostra na sala ao abrir, e quantos mais cada "Ver mais" revela. */
export const BID_HISTORY_INITIAL = 5;
export const BID_HISTORY_STEP = 10;
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
  EXTRACT: '/carteira/extrato',
  MY_BIDS: '/arremates',
  RECEIPT: '/r/:code',
  AUDIT: '/auditoria/:id',
} as const;

/** Nome de cada página no menu e no breadcrumb. */
export const PAGE_LABELS = {
  [ROUTES.SHOWCASE]: 'Vitrine',
  [ROUTES.MY_BIDS]: 'Meus arremates',
  [ROUTES.WALLET]: 'Carteira',
  [ROUTES.EXTRACT]: 'Extrato',
  [ROUTES.AUCTIONEER_PANEL]: 'Painel do leiloeiro',
} as const;

export const ROUTE_ROLES = {
  [ROUTES.AUCTIONEER_PANEL]: Role.AUCTIONEER,
  [ROUTES.WALLET]: Role.BIDDER,
  [ROUTES.EXTRACT]: Role.BIDDER,
  [ROUTES.MY_BIDS]: Role.BIDDER,
} as const satisfies Record<string, Role>;

export const lotPath = (id: string) => ROUTES.LOT.replace(':id', encodeURIComponent(id));
export const receiptPath = (code: string) => ROUTES.RECEIPT.replace(':code', encodeURIComponent(code));
export const auditPath = (id: string) => ROUTES.AUDIT.replace(':id', encodeURIComponent(id));

export const DEPOSIT_FIELD_ID = 'deposit';
export const DEPOSIT_PATH = `${ROUTES.WALLET}#${DEPOSIT_FIELD_ID}`;

export const STORAGE_KEYS = { TOKEN: 'athelie:token', THEME: 'athelie:theme' } as const;

export const SOCIAL_LINKS = {
  GITHUB: 'https://github.com/DevPauloV',
  LINKEDIN: 'https://www.linkedin.com/in/paulo-victor-434492236',
} as const;

export const Theme = { SYSTEM: 'system', LIGHT: 'light', DARK: 'dark' } as const;
export type Theme = ValueOf<typeof Theme>;

/** Contas criadas pelo seed da API (athelie-leiloes-api/src/seed/seed.ts), oferecidas na tela de entrar. */
export const DEMO_PASSWORD = 'athelie12345';
export const DEMO_ACCOUNTS = [
  { initials: 'LE', label: 'Leiloeiro', email: 'leiloeiro@athelie.dev', role: Role.AUCTIONEER },
  { initials: 'L1', label: 'Licitante 01', email: 'licitante01@athelie.dev', role: Role.BIDDER },
  { initials: 'L2', label: 'Licitante 02', email: 'licitante02@athelie.dev', role: Role.BIDDER },
] as const;

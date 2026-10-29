type ValueOf<T> = T[keyof T];

export const Role = { AUCTIONEER: 'auctioneer', BIDDER: 'bidder' } as const;
export type Role = ValueOf<typeof Role>;

export const LotState = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  SETTLED: 'settled',
} as const;
export type LotState = ValueOf<typeof LotState>;

/** Derivado de `state` e do relógio do servidor; nunca salvo. */
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

/** O que mexeu na carteira do licitante: a lista do extrato. */
export const WalletEntryType = {
  DEPOSIT: 'deposit',
  HOLD: 'hold',
  RELEASE: 'release',
  WIN: 'win',
  REFUND: 'refund',
} as const;
export type WalletEntryType = ValueOf<typeof WalletEntryType>;

/** Filtro do extrato por tipo; `ALL` não filtra. */
export const EntryFilter = {
  ALL: 'all',
  DEPOSITS: 'deposits',
  BIDS: 'bids',
  WINS: 'wins',
  CANCELLATIONS: 'cancellations',
} as const;
export type EntryFilter = ValueOf<typeof EntryFilter>;
export const ENTRY_FILTER_TYPES: Record<Exclude<EntryFilter, typeof EntryFilter.ALL>, WalletEntryType[]> = {
  [EntryFilter.DEPOSITS]: [WalletEntryType.DEPOSIT],
  [EntryFilter.BIDS]: [WalletEntryType.HOLD, WalletEntryType.RELEASE],
  [EntryFilter.WINS]: [WalletEntryType.WIN],
  [EntryFilter.CANCELLATIONS]: [WalletEntryType.REFUND],
};
export const EntryPeriod = { WEEK: '7d', ALL: 'all' } as const;
export type EntryPeriod = ValueOf<typeof EntryPeriod>;
export const WALLET_ENTRIES_PAGE_SIZE = 20;
export const WALLET_ENTRIES_MAX_PAGE = 1000;

export const SocketEvent = {
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

export const AuditProblem = {
  ALTERED: 'altered',
  MISSING: 'missing',
  INSERTED: 'inserted',
  HEAD_MISMATCH: 'head_mismatch',
} as const;
export type AuditProblem = ValueOf<typeof AuditProblem>;

export const ANTI_SNIPING_WINDOW_MS = 120_000;
export const ANTI_SNIPING_EXTENSION_MS = 120_000;
export const SETTLEMENT_SWEEP_INTERVAL_MS = 2_000;
/** Avisos do Socket.IO entre instâncias da API (ADR 0005); o TTL apaga os antigos. */
export const SOCKET_ADAPTER_COLLECTION = 'socket_events';
export const SOCKET_ADAPTER_TTL_SECONDS = 3_600;
export const MET_TIMEOUT_MS = 5_000;
export const MET_RETRIES = 1;
export const MET_SEARCH_LIMIT = 20;
export const MET_QUERY_MAX_LENGTH = 100;
/** Mais que MET_SEARCH_LIMIT: muitos ids são descartados (sem imagem ou fora do domínio público). */
export const MET_SEARCH_CANDIDATES = 60;
/** Bem abaixo do limite do Met (~80 req/s). */
export const MET_CONCURRENCY = 6;
/** Tolerância para `startsAt` "agora" que chega alguns segundos no passado. */
export const LOT_START_TOLERANCE_MS = 30_000;
export const LOTS_PAGE_SIZE = 12;
export const LOTS_MAX_PAGE = 1000;
export const LOT_SEARCH_MAX_LENGTH = 80;
/** Janela do filtro de período da vitrine: até o fim (ao vivo), até o início (agendado) ou desde o fim (encerrado). */
export const LotPeriod = { DAY: '24h', WEEK: '7d', MONTH: '30d' } as const;
export type LotPeriod = ValueOf<typeof LotPeriod>;
export const LOT_PERIOD_MS: Record<LotPeriod, number> = {
  [LotPeriod.DAY]: 86_400_000,
  [LotPeriod.WEEK]: 7 * 86_400_000,
  [LotPeriod.MONTH]: 30 * 86_400_000,
};
/** Centavos (R$ 100.000,00). */
export const MAX_DEPOSIT = 10_000_000;
export const MAX_IMAGE_BYTES = 2_097_152;
export const PSEUDONYM_HEX_LENGTH = 6;
export const GENESIS_HASH = '0'.repeat(64);
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 80;
export const PASSWORD_MIN_LENGTH = 8;
/** RFC 5321. */
export const EMAIL_MAX_LENGTH = 254;
export const LOGIN_RATE_LIMIT_MAX = 10;
export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60_000;
export const BID_RATE_LIMIT_MAX = 30;
export const BID_RATE_LIMIT_WINDOW_MS = 60_000;
export const LOT_DETAIL_BIDS_LIMIT = 50;
/** 22 caracteres em base64url. */
export const RECEIPT_CODE_BYTES = 16;
export const LOCALE = 'pt-BR';
export const CURRENCY = 'BRL';

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

/** `{campo}` é trocado por `details.campo` (centavos) formatado em R$. */
export const ERRORS = {
  VALIDATION_ERROR: { status: 400, message: 'Dados inválidos.' },
  UNAUTHENTICATED: { status: 401, message: 'Faça login para continuar.' },
  INVALID_CREDENTIALS: { status: 401, message: 'E-mail ou senha incorretos.' },
  FORBIDDEN: { status: 403, message: 'Você não tem permissão para esta ação.' },
  AUCTIONEER_CANNOT_BID: { status: 403, message: 'Leiloeiros não podem dar lances.' },
  NOT_FOUND: { status: 404, message: 'Não encontrado.' },
  EMAIL_TAKEN: { status: 409, message: 'Este e-mail já está cadastrado.' },
  LOT_NOT_STARTED: { status: 409, message: 'Este lote ainda não começou.' },
  LOT_ENDED: { status: 409, message: 'Este lote já foi encerrado.' },
  LOT_CANCELLED: { status: 409, message: 'Este lote foi cancelado.' },
  ALREADY_WINNING: { status: 409, message: 'Você já está ganhando este lote.' },
  BID_TOO_LOW: { status: 422, message: 'O lance mínimo aceito é {minimum}.' },
  INSUFFICIENT_FUNDS: { status: 422, message: 'Saldo disponível insuficiente. Você tem {available}.' },
  RATE_LIMITED: { status: 429, message: 'Muitas tentativas. Aguarde um pouco.' },
  EXTERNAL_API_UNAVAILABLE: {
    status: 503,
    message: 'O Met está fora do ar. Tente de novo em alguns minutos; os lotes já criados não são afetados.',
  },
  INTERNAL_ERROR: { status: 500, message: 'Erro inesperado. Tente de novo.' },
} as const satisfies Record<ErrorCode, { status: number; message: string }>;

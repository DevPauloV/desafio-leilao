// Cadeia de hashes dos lances (contrato, seção 5). Funções puras: o segredo (AUDIT_SECRET) entra como parâmetro.
import { createHmac } from 'node:crypto';
import { AuditProblem, GENESIS_HASH, LotState, PSEUDONYM_HEX_LENGTH } from '../constants.js';

const PSEUDONYM_PREFIX = 'Licitante #';

function hmacHex(secret: string, data: string): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

/** Identificador público estável do licitante dentro de um lote; muda de lote para lote. */
export function pseudonym(secret: string, userId: string, lotId: string): string {
  const code = hmacHex(secret, `${userId}:${lotId}`).slice(0, PSEUDONYM_HEX_LENGTH).toUpperCase();
  return `${PSEUDONYM_PREFIX}${code}`;
}

export type ChainedBid = {
  lotId: string;
  seq: number;
  pseudonym: string;
  amount: number;
  createdAt: Date;
  prevHash: string;
};

/** Hash do lance: depende de todos os campos públicos e do hash anterior (encadeia). */
export function bidHash(secret: string, bid: ChainedBid): string {
  return hmacHex(
    secret,
    JSON.stringify([bid.lotId, bid.seq, bid.pseudonym, bid.amount, bid.createdAt.toISOString(), bid.prevHash]),
  );
}

/** Assinatura da cabeça da cadeia, guardada no lote: revela remoção do último lance. */
export function headSignature(secret: string, lotId: string, bidCount: number, lastHash: string): string {
  return hmacHex(secret, `head:${lotId}:${bidCount}:${lastHash}`);
}

export type StoredBid = ChainedBid & { hash: string; bidderId: string };

/** O que o lote afirma sobre a cadeia. Ids só para conferir pseudônimos; nunca saem na resposta. */
export type ChainedLot = {
  id: string;
  state: string;
  bidCount: number;
  /** Pode faltar se alguém apagou o campo direto no banco. */
  chainHead?: { lastHash: string; signature: string } | null;
  leaderId: string | null;
  currentBid: number | null;
  result: { winnerId: string | null; winnerPseudonym: string | null; amount: number | null; chainHash: string } | null;
};

export type Verdict = { intact: boolean; firstInvalidSeq?: number; problem?: AuditProblem };

/** Campo adulterado com tipo errado (ex.: createdAt como texto) faz o cálculo falhar: conta como não confere. */
function holds(check: () => boolean): boolean {
  try {
    return check();
  } catch {
    return false;
  }
}

/**
 * O que o lote diz sobre o líder, o lance atual e o resultado tem de bater com o último lance da cadeia.
 * Sem isso, trocar o vencedor ou o líder direto no banco passaria pela auditoria (e pela liquidação).
 */
function lotMatchesChain(secret: string, lot: ChainedLot, last: StoredBid | null): boolean {
  const ownsLast = (userId: string | null) => userId != null && pseudonym(secret, userId, lot.id) === last?.pseudonym;
  if (lot.state === LotState.CANCELLED) return true; // só a cadeia e a cabeça
  if (lot.state === LotState.ACTIVE) {
    return last
      ? lot.currentBid === last.amount && ownsLast(lot.leaderId)
      : lot.currentBid == null && lot.leaderId == null;
  }
  if (lot.state === LotState.SETTLED && lot.result) {
    const { winnerId, winnerPseudonym, amount, chainHash } = lot.result;
    // A liquidação grava chainHead.lastHash: GENESIS_HASH quando não houve lance.
    if (chainHash !== (last?.hash ?? GENESIS_HASH)) return false;
    return last
      ? ownsLast(winnerId) && winnerPseudonym === last.pseudonym && amount === last.amount
      : winnerId == null && winnerPseudonym == null && amount == null;
  }
  return false; // liquidado sem resultado ou estado desconhecido
}

/**
 * Recalcula a cadeia de um lote (contrato, seção 5). `bids` em ordem de seq (e de inserção, no empate).
 * Cada lance é `valid` se o seq é o esperado, o prevHash aponta para o hash gravado no lance anterior, o
 * hash recalculado bate e o pseudônimo é o do autor: só o lance adulterado fica marcado.
 * O veredito traz o primeiro problema encontrado.
 */
export function verifyChain(secret: string, lot: ChainedLot, bids: StoredBid[]) {
  const head = lot.chainHead ?? null;
  // Sem assinatura válida, a contagem da cabeça não é confiável para classificar os lances: o problema é a cabeça.
  const headSigned =
    head != null && holds(() => headSignature(secret, lot.id, lot.bidCount, head.lastHash) === head.signature);
  let first: { seq: number; problem: AuditProblem } | null = headSigned
    ? null
    : { seq: lot.bidCount, problem: AuditProblem.HEAD_MISMATCH };
  const seen = new Set<number>();
  let expectedSeq = 1;
  let previousHash = GENESIS_HASH;
  let last: StoredBid | null = null;
  const checked: (StoredBid & { valid: boolean })[] = [];

  for (const bid of bids) {
    const seqOk = bid.seq === expectedSeq;
    const prevOk = bid.prevHash === previousHash;
    const hashOk = holds(() => bidHash(secret, { ...bid, lotId: lot.id }) === bid.hash);
    const ownerOk = holds(() => pseudonym(secret, bid.bidderId, lot.id) === bid.pseudonym);
    checked.push({ ...bid, valid: seqOk && prevOk && hashOk && ownerOk });

    // Seq repetido ou abaixo do esperado (ex.: 0) não pertence à cadeia: os seguintes seguem ligados ao original.
    const outOfChain = seen.has(bid.seq) || bid.seq < expectedSeq;
    if (outOfChain || bid.seq > lot.bidCount) first ??= { seq: bid.seq, problem: AuditProblem.INSERTED };
    else if (bid.seq > expectedSeq) first ??= { seq: expectedSeq, problem: AuditProblem.MISSING }; // o seq que sumiu
    else if (!prevOk) first ??= { seq: bid.seq, problem: AuditProblem.MISSING };
    else if (!hashOk || !ownerOk) first ??= { seq: bid.seq, problem: AuditProblem.ALTERED };

    if (!outOfChain) {
      seen.add(bid.seq);
      expectedSeq = bid.seq + 1;
      previousHash = bid.hash;
      last = bid;
    }
  }

  // A cabeça assinada promete quantos lances existem e qual é o último; o lote, quem lidera ou venceu e por quanto.
  const headMatches =
    head != null && (last?.seq ?? 0) === lot.bidCount && (last?.hash ?? GENESIS_HASH) === head.lastHash;
  const stateMatches = holds(() => lotMatchesChain(secret, lot, last));
  if (!headMatches || !stateMatches) first ??= { seq: lot.bidCount, problem: AuditProblem.HEAD_MISMATCH };

  const verdict: Verdict = first
    ? {
        intact: false,
        // Só não aponta lance quando não existe lance nenhum.
        ...(bids.length > 0 && { firstInvalidSeq: first.seq }),
        problem: first.problem,
      }
    : { intact: true };
  return { bids: checked, verdict };
}

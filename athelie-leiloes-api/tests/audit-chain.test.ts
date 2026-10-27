import { describe, expect, it } from 'vitest';
import { GENESIS_HASH } from '../src/constants.js';
import { bidHash, headSignature, pseudonym, type ChainedBid } from '../src/domain/audit-chain.js';

const SECRET = 'segredo-de-teste';
const bid: ChainedBid = {
  lotId: 'lote-1',
  seq: 1,
  pseudonym: 'Licitante #ABC123',
  amount: 10_000,
  createdAt: new Date('2026-10-25T12:00:00.000Z'),
  prevHash: GENESIS_HASH,
};

describe('bidHash', () => {
  it('é determinístico e tem 64 caracteres hex', () => {
    expect(bidHash(SECRET, bid)).toBe(bidHash(SECRET, { ...bid }));
    expect(bidHash(SECRET, bid)).toMatch(/^[a-f\d]{64}$/);
  });

  it('mudar qualquer campo, ou o segredo, muda o hash', () => {
    const original = bidHash(SECRET, bid);
    const variants: ChainedBid[] = [
      { ...bid, lotId: 'lote-2' },
      { ...bid, seq: 2 },
      { ...bid, pseudonym: 'Licitante #ABC124' },
      { ...bid, amount: 10_001 },
      { ...bid, createdAt: new Date('2026-10-25T12:00:00.001Z') },
      { ...bid, prevHash: '1'.repeat(64) },
    ];
    for (const variant of variants) expect(bidHash(SECRET, variant)).not.toBe(original);
    expect(bidHash('outro-segredo', bid)).not.toBe(original);
  });
});

describe('pseudonym', () => {
  it('é estável no mesmo lote e muda de lote para lote', () => {
    const first = pseudonym(SECRET, 'user-1', 'lote-1');
    expect(first).toMatch(/^Licitante #[A-F\d]{6}$/);
    expect(pseudonym(SECRET, 'user-1', 'lote-1')).toBe(first);
    expect(pseudonym(SECRET, 'user-1', 'lote-2')).not.toBe(first);
    expect(pseudonym(SECRET, 'user-2', 'lote-1')).not.toBe(first);
  });
});

describe('headSignature', () => {
  it('muda com o número de lances e com o último hash', () => {
    const empty = headSignature(SECRET, 'lote-1', 0, GENESIS_HASH);
    expect(headSignature(SECRET, 'lote-1', 0, GENESIS_HASH)).toBe(empty);
    expect(headSignature(SECRET, 'lote-1', 1, GENESIS_HASH)).not.toBe(empty);
    expect(headSignature(SECRET, 'lote-1', 0, '1'.repeat(64))).not.toBe(empty);
    expect(headSignature(SECRET, 'lote-2', 0, GENESIS_HASH)).not.toBe(empty);
  });
});

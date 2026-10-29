export const SAMPLE_AMOUNTS = [50000, 55000, 62000]; // centavos
const GENESIS_HASH = '0'.repeat(64);

type Link = { prev: string; hash: string };

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const linkHash = (prev: string, seq: number, cents: number) => sha256(`${prev}|${seq}|${cents}`);

let originalChain: Promise<Link[]> | null = null;

// Corrente "registrada": calculada uma vez a partir dos valores de exemplo.
export function getOriginalChain(): Promise<Link[]> {
  originalChain ??= (async () => {
    const chain: Link[] = [];
    let prev = GENESIS_HASH;
    for (const [index, cents] of SAMPLE_AMOUNTS.entries()) {
      const hash = await linkHash(prev, index + 1, cents);
      chain.push({ prev, hash });
      prev = hash;
    }
    return chain;
  })();
  return originalChain;
}

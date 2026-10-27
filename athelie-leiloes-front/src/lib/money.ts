import { CURRENCY, LOCALE } from '@/constants';

// Dinheiro é sempre inteiro em centavos; só vira texto na exibição.

const brl = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY });
const brlWhole = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 });

/**
 * 1240000 -> "R$ 12.400,00".
 * `short` tira os centavos quando são zero ("R$ 12.400"), como nos valores grandes do protótipo.
 */
export function formatMoney(cents: number, { short = false } = {}): string {
  if (short && cents % 100 === 0) return brlWhole.format(cents / 100);
  return brl.format(cents / 100);
}

const decimal = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 1290000 -> "12.900,00": o formato que o campo de valor aceita, para preencher com os botões rápidos. */
export function formatMoneyInput(cents: number): string {
  return decimal.format(cents / 100);
}

// "12.400,00", "12400", "12400,5", "R$ 12.400": ponto separa milhar, vírgula separa centavos.
const MONEY_PATTERN = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;
const MAX_DIGITS = 13;

/** Texto digitado -> centavos. Devolve `null` se não for um valor válido. */
export function parseMoney(text: string): number | null {
  const clean = text.replace(/R\$/i, '').replace(/\s/g, '');
  const match = MONEY_PATTERN.exec(clean);
  if (!match) return null;
  const reais = match[1].replace(/\./g, '');
  if (reais.length > MAX_DIGITS) return null;
  const cents = (match[2] ?? '').padEnd(2, '0');
  return Number(reais) * 100 + Number(cents);
}

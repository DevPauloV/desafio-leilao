import { CURRENCY, LOCALE } from '@/constants';

const brl = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY });
const brlWhole = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 });

export function formatMoney(cents: number, { short = false } = {}): string {
  if (short && cents % 100 === 0) return brlWhole.format(cents / 100);
  return brl.format(cents / 100);
}

const decimal = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMoneyInput(cents: number): string {
  return decimal.format(cents / 100);
}

// "12.400,00", "12400", "12400,5": ponto separa milhar, vírgula separa centavos.
const MONEY_PATTERN = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;
const MAX_DIGITS = 13;

export function parseMoney(text: string): number | null {
  const clean = text.replace(/R\$/i, '').replace(/\s/g, '');
  const match = MONEY_PATTERN.exec(clean);
  if (!match) return null;
  const reais = match[1].replace(/\./g, '');
  if (reais.length > MAX_DIGITS) return null;
  const cents = (match[2] ?? '').padEnd(2, '0');
  return Number(reais) * 100 + Number(cents);
}

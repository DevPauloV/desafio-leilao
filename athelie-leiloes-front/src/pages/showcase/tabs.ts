import { LotPeriod, LotStatus } from '@/constants';
import { formatMoney } from '@/lib/money';

const AHEAD: Record<LotPeriod, string> = {
  [LotPeriod.DAY]: 'Nas próximas 24 h',
  [LotPeriod.WEEK]: 'Nos próximos 7 dias',
  [LotPeriod.MONTH]: 'Nos próximos 30 dias',
};

export const TABS = [
  {
    status: LotStatus.LIVE,
    label: 'Ao vivo',
    emptyTitle: 'Nenhum leilão acontecendo agora',
    emptyText: 'Quando um lote abrir para lances, ele aparece aqui com a contagem regressiva.',
    filteredTitle: 'Nenhum lote ao vivo com esses filtros',
    priceLabel: 'Lance atual',
    periodLabel: 'Termina',
    periods: AHEAD,
  },
  {
    status: LotStatus.SCHEDULED,
    label: 'Agendados',
    emptyTitle: 'Nenhum leilão agendado',
    emptyText: 'Novos lotes aparecem aqui assim que um leiloeiro os publica, com a data de abertura.',
    filteredTitle: 'Nenhum lote agendado com esses filtros',
    priceLabel: 'Lance inicial',
    periodLabel: 'Começa',
    periods: AHEAD,
  },
  {
    status: LotStatus.ENDED,
    label: 'Encerrados',
    emptyTitle: 'Nenhum leilão encerrado ainda',
    emptyText: 'Quando um lote termina, o valor de arremate e o histórico de lances auditável ficam aqui.',
    filteredTitle: 'Nenhum lote encerrado com esses filtros',
    priceLabel: 'Valor final',
    periodLabel: 'Encerrou',
    periods: {
      [LotPeriod.DAY]: 'Nas últimas 24 h',
      [LotPeriod.WEEK]: 'Nos últimos 7 dias',
      [LotPeriod.MONTH]: 'Nos últimos 30 dias',
    },
  },
] as const;

export type ShowcaseTab = (typeof TABS)[number];

export type ShowcaseStatus = ShowcaseTab['status'];

/** Preços em centavos; `null` = sem limite. */
export type Filters = {
  q: string;
  department: string;
  artist: string;
  minPrice: number | null;
  maxPrice: number | null;
  period: LotPeriod | null;
};

export const NO_FILTERS: Filters = { q: '', department: '', artist: '', minPrice: null, maxPrice: null, period: null };

export const resultCount = (n: number) => `${n} ${n === 1 ? 'resultado' : 'resultados'}`;

const money = (cents: number) => formatMoney(cents, { short: true });

function priceText(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return `${money(min)} a ${money(max)}`;
  return min !== null ? `a partir de ${money(min)}` : `até ${money(max ?? 0)}`;
}

export type ActiveFilter = { label: string; value: string; clear: Partial<Filters> };

export function activeFilters(filters: Filters, tab: ShowcaseTab): ActiveFilter[] {
  const { q, department, artist, minPrice, maxPrice, period } = filters;
  const active: ActiveFilter[] = [];
  if (q) active.push({ label: 'Busca', value: q, clear: { q: '' } });
  if (department) active.push({ label: 'Departamento', value: department, clear: { department: '' } });
  if (artist) active.push({ label: 'Artista', value: artist, clear: { artist: '' } });
  if (minPrice !== null || maxPrice !== null) {
    active.push({ label: tab.priceLabel, value: priceText(minPrice, maxPrice), clear: { minPrice: null, maxPrice: null } });
  }
  if (period) active.push({ label: tab.periodLabel, value: tab.periods[period].toLowerCase(), clear: { period: null } });
  return active;
}

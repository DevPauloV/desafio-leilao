import { LotPeriod } from '@/constants';
import type { Facet } from '@/types';
import { TABS, type Filters, type ShowcaseStatus } from './tabs';

export const isShowcaseStatus = (value: string | null): value is ShowcaseStatus => TABS.some((tab) => tab.status === value);
const isPeriod = (value: string | null): value is LotPeriod => Object.values(LotPeriod).some((period) => period === value);

/** O estado da vitrine fica na URL, para compartilhar e voltar com o navegador. Preços em centavos, como na API. */
export const Param = {
  STATUS: 'status',
  PAGE: 'page',
  QUERY: 'q',
  DEPARTMENT: 'department',
  ARTIST: 'artist',
  MIN_PRICE: 'minPrice',
  MAX_PRICE: 'maxPrice',
  PERIOD: 'period',
} as const;

function centsParam(value: string | null): number | null {
  const cents = Number(value);
  return value && Number.isInteger(cents) && cents >= 0 ? cents : null;
}

export function filtersFromParams(params: URLSearchParams): Filters {
  const period = params.get(Param.PERIOD);
  return {
    q: params.get(Param.QUERY)?.trim() ?? '',
    department: params.get(Param.DEPARTMENT) ?? '',
    artist: params.get(Param.ARTIST) ?? '',
    minPrice: centsParam(params.get(Param.MIN_PRICE)),
    maxPrice: centsParam(params.get(Param.MAX_PRICE)),
    period: isPeriod(period) ? period : null,
  };
}

/** Os mesmos nomes servem à URL da página e à query da API. */
export function filterParams({ q, department, artist, minPrice, maxPrice, period }: Filters): URLSearchParams {
  const query = new URLSearchParams();
  if (q) query.set(Param.QUERY, q);
  if (department) query.set(Param.DEPARTMENT, department);
  if (artist) query.set(Param.ARTIST, artist);
  if (minPrice !== null) query.set(Param.MIN_PRICE, String(minPrice));
  if (maxPrice !== null) query.set(Param.MAX_PRICE, String(maxPrice));
  if (period) query.set(Param.PERIOD, period);
  return query;
}

export function lotsUrl(status: ShowcaseStatus, filters: Filters, page = 1): string {
  const query = filterParams(filters);
  query.set(Param.STATUS, status);
  query.set(Param.PAGE, String(page));
  return `/api/lots?${query}`;
}

/** Valor escolhido que não está nas contagens da aba (link antigo, outra aba) continua na lista, com zero. */
export const withSelected = (items: Facet[], value: string) =>
  value && !items.some((item) => item.name === value) ? [{ name: value, count: 0 }, ...items] : items;

import { LotStatus } from '@/constants';

export const TABS = [
  {
    status: LotStatus.LIVE,
    label: 'Ao vivo',
    emptyTitle: 'Nenhum leilão acontecendo agora',
    emptyText: 'Quando um lote abrir para lances, ele aparece aqui com a contagem regressiva.',
    filteredTitle: 'Nenhum lote ao vivo com esses filtros',
  },
  {
    status: LotStatus.SCHEDULED,
    label: 'Agendados',
    emptyTitle: 'Nenhum leilão agendado',
    emptyText: 'Novos lotes aparecem aqui assim que um leiloeiro os publica, com a data de abertura.',
    filteredTitle: 'Nenhum lote agendado com esses filtros',
  },
  {
    status: LotStatus.ENDED,
    label: 'Encerrados',
    emptyTitle: 'Nenhum leilão encerrado ainda',
    emptyText: 'Quando um lote termina, o valor de arremate e o histórico de lances auditável ficam aqui.',
    filteredTitle: 'Nenhum lote encerrado com esses filtros',
  },
] as const;

export type ShowcaseTab = (typeof TABS)[number];

export type ShowcaseStatus = ShowcaseTab['status'];

export type Filters = { q: string; department: string };

export const resultCount = (n: number) => `${n} ${n === 1 ? 'resultado' : 'resultados'}`;

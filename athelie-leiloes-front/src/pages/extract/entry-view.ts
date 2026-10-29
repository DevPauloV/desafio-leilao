import { EntryFilter, EntryPeriod, EntryType } from '@/constants';
import type { Badge } from '@/components/ui/badge';
import type { ComponentProps } from 'react';

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>['variant']>;

type EntryView = {
  label: string;
  note: string;
  /** Sinal do valor: só depósito entra e só arremate sai; o resto é reserva ou liberação. */
  sign: string;
  caption: string;
  variant: BadgeVariant;
  amountClassName: string;
};

export const ENTRY_VIEW: Record<EntryType, EntryView> = {
  [EntryType.DEPOSIT]: { label: 'Depósito', note: 'Depósito simulado', sign: '+ ', caption: 'entrou', variant: 'win', amountClassName: 'text-win' },
  [EntryType.HOLD]: { label: 'Lance reservado', note: 'Você lidera este lote', sign: '', caption: 'reservado', variant: 'warn', amountClassName: 'text-warn' },
  [EntryType.RELEASE]: { label: 'Lance superado', note: 'Valor liberado na hora', sign: '', caption: 'liberado', variant: 'neutral', amountClassName: 'text-win' },
  [EntryType.WIN]: { label: 'Arremate', note: 'Debitado do saldo', sign: '− ', caption: 'debitado', variant: 'accent', amountClassName: 'text-primary' },
  [EntryType.REFUND]: { label: 'Lote cancelado', note: 'Valor liberado', sign: '', caption: 'liberado', variant: 'neutral', amountClassName: 'text-win' },
};

export const DEPOSIT_TITLE = 'Depósito na carteira';

export const FILTER_OPTIONS: { value: EntryFilter; label: string }[] = [
  { value: EntryFilter.ALL, label: 'Todos' },
  { value: EntryFilter.DEPOSITS, label: 'Depósitos' },
  { value: EntryFilter.BIDS, label: 'Lances' },
  { value: EntryFilter.WINS, label: 'Arremates' },
  { value: EntryFilter.CANCELLATIONS, label: 'Cancelamentos' },
];

export const PERIOD_OPTIONS: { value: EntryPeriod; label: string }[] = [
  { value: EntryPeriod.WEEK, label: 'Últimos 7 dias' },
  { value: EntryPeriod.ALL, label: 'Todo o período' },
];

export const DEFAULT_FILTER = EntryFilter.ALL;
export const DEFAULT_PERIOD = EntryPeriod.WEEK;

export const isEntryFilter = (value: string): value is EntryFilter => FILTER_OPTIONS.some((option) => option.value === value);
export const isEntryPeriod = (value: string): value is EntryPeriod => PERIOD_OPTIONS.some((option) => option.value === value);

export const labelOf = <T extends string>(options: { value: T; label: string }[], value: T) =>
  options.find((option) => option.value === value)?.label ?? '';

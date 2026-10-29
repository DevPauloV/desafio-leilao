import { FiltersScreen } from '@/components/filters-screen';
import { TAB_LIST_CLASS, TAB_TRIGGER_CLASS } from '@/components/tab-styles';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { EntryFilter, EntryPeriod } from '@/constants';
import {
  DEFAULT_FILTER,
  DEFAULT_PERIOD,
  FILTER_OPTIONS,
  PERIOD_OPTIONS,
  isEntryFilter,
  isEntryPeriod,
  labelOf,
} from './entry-view';
import { RadioOptions } from './radio-options';

type Props = {
  filter: EntryFilter;
  period: EntryPeriod;
  /** Movimentos que o filtro atual mostra, `null` enquanto carrega. */
  total: number | null;
  onFilter: (filter: EntryFilter) => void;
  onPeriod: (period: EntryPeriod) => void;
};

const movements = (count: number) => `${count} ${count === 1 ? 'movimento' : 'movimentos'}`;

/** Desktop: abas de tipo à esquerda e de período à direita. Celular: botão de filtro que abre a tela cheia. */
export function ExtractFilters({ filter, period, total, onFilter, onPeriod }: Props) {
  const activeCount = Number(filter !== DEFAULT_FILTER) + Number(period !== DEFAULT_PERIOD);
  const resultLabel = total === null ? 'Ver movimentos' : total === 0 ? 'Nenhum movimento' : `Ver ${movements(total)}`;

  return (
    <>
      <div className="hidden flex-wrap items-center justify-between gap-x-4 gap-y-2.5 md:flex">
        <Tabs value={filter} onValueChange={(value) => isEntryFilter(value) && onFilter(value)}>
          <TabsList aria-label="Tipo de movimento" className={TAB_LIST_CLASS}>
            {FILTER_OPTIONS.map((option) => (
              <TabsTrigger key={option.value} value={option.value} className={TAB_TRIGGER_CLASS}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Tabs value={period} onValueChange={(value) => isEntryPeriod(value) && onPeriod(value)}>
          <TabsList aria-label="Período" className={TAB_LIST_CLASS}>
            {PERIOD_OPTIONS.map((option) => (
              <TabsTrigger key={option.value} value={option.value} className={TAB_TRIGGER_CLASS}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex items-center gap-3 md:hidden">
        <FiltersScreen
          activeCount={activeCount}
          backLabel="Voltar para o extrato"
          resultLabel={resultLabel}
          onClear={() => {
            onFilter(DEFAULT_FILTER);
            onPeriod(DEFAULT_PERIOD);
          }}
        >
          <div className="grid gap-7">
            <RadioOptions legend="Tipo de movimento" options={FILTER_OPTIONS} value={filter} onChange={onFilter} />
            <RadioOptions legend="Período" options={PERIOD_OPTIONS} value={period} onChange={onPeriod} />
          </div>
        </FiltersScreen>
        <div className="grid min-w-0 gap-0">
          <span className="text-[13.5px] font-semibold">{labelOf(PERIOD_OPTIONS, period)}</span>
          <span className="text-xs text-muted-foreground">
            {labelOf(FILTER_OPTIONS, filter)}
            {total !== null && ` · ${movements(total)}`}
          </span>
        </div>
      </div>
    </>
  );
}

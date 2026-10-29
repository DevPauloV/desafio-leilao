import { FiltersScreen } from '@/components/filters-screen';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MyLot } from '@/types';
import { ALL_STATUSES, STATUS_OPTIONS, isStatusFilter, type StatusFilter } from './lot-filter';
import { SearchField } from './search-field';
import { StatusRadios } from './status-radios';

type Props = {
  lots: MyLot[];
  shown: number;
  status: StatusFilter;
  query: string;
  onStatus: (status: StatusFilter) => void;
  onQuery: (query: string) => void;
};

/** Desktop: busca à esquerda e status à direita. Celular: botão de filtro que abre a tela cheia. */
export function LotsFilter({ lots, shown, status, query, onStatus, onQuery }: Props) {
  const count = (value: StatusFilter) => (value === ALL_STATUSES ? lots.length : lots.filter((lot) => lot.status === value).length);
  const activeCount = Number(status !== ALL_STATUSES) + Number(query.trim() !== '');

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h2 id="all-lots-heading" className="text-[13px] font-semibold tracking-widest text-muted-foreground uppercase">
          Todos os lotes
        </h2>
        <div className="md:hidden">
          <FiltersScreen
            activeCount={activeCount}
            backLabel="Voltar para o painel"
            resultLabel={`Ver ${shown} ${shown === 1 ? 'lote' : 'lotes'}`}
            onClear={() => {
              onStatus(ALL_STATUSES);
              onQuery('');
            }}
          >
            <div className="grid gap-7">
              <SearchField query={query} onQuery={onQuery} />
              <StatusRadios status={status} count={count} onStatus={onStatus} />
            </div>
          </FiltersScreen>
        </div>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <div className="w-full max-w-95">
          <SearchField query={query} onQuery={onQuery} />
        </div>
        <Select value={status} onValueChange={(value) => isStatusFilter(value) && onStatus(value)}>
          <SelectTrigger aria-label="Status" className="h-10! w-52 bg-card text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label} ({count(option.value)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

import { useId } from 'react';
import { SearchIcon } from 'lucide-react';
import { FiltersScreen } from '@/components/filters-screen';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LotStatus } from '@/constants';
import type { MyLot } from '@/types';

export const ALL_STATUSES = 'all';
export type StatusFilter = typeof ALL_STATUSES | LotStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: ALL_STATUSES, label: 'Todos' },
  { value: LotStatus.LIVE, label: 'Ao vivo' },
  { value: LotStatus.SCHEDULED, label: 'Agendados' },
  { value: LotStatus.ENDED, label: 'Encerrados' },
  { value: LotStatus.CANCELLED, label: 'Cancelados' },
];

const isStatusFilter = (value: string): value is StatusFilter => STATUS_OPTIONS.some((option) => option.value === value);

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

function SearchField({ query, onQuery }: { query: string; onQuery: (query: string) => void }) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-lg border border-input bg-card px-3 text-muted-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <SearchIcon className="size-4 shrink-0" aria-hidden="true" />
      <input
        type="search"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        placeholder="Buscar por obra ou artista"
        aria-label="Buscar nos meus lotes"
        className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-none"
      />
    </label>
  );
}

function StatusRadios({
  status,
  count,
  onStatus,
}: {
  status: StatusFilter;
  count: (value: StatusFilter) => number;
  onStatus: (status: StatusFilter) => void;
}) {
  const name = useId();
  return (
    <fieldset className="grid gap-0.5">
      <legend className="mb-2 text-[11px] font-bold tracking-[0.09em] text-muted-foreground uppercase">Status</legend>
      {STATUS_OPTIONS.map((option) => (
        <label key={option.value} className="flex cursor-pointer items-center gap-2.5 py-2 text-[15px]">
          <input
            type="radio"
            name={name}
            checked={status === option.value}
            onChange={() => onStatus(option.value)}
            className="size-4 accent-primary"
          />
          <span className="flex-1">{option.label}</span>
          <span className="font-mono text-xs text-muted-foreground">{count(option.value)}</span>
        </label>
      ))}
    </fieldset>
  );
}

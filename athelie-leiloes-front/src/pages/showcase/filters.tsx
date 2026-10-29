import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Dialog } from 'radix-ui';
import { cn } from 'cn';
import { ArrowLeftIcon, ListFilterIcon, SearchIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LOCALE, LotPeriod } from '@/constants';
import { formatMoneyInput, parseMoney } from '@/lib/money';
import type { Facet } from '@/types';
import type { ActiveFilter, Filters, ShowcaseTab } from './tabs';

const ARTIST_PREVIEW = 6;

/** Faixas pensadas para os valores dos lotes do seed (R$ 400 a R$ 3.350). */
const PRICE_PRESETS = [
  { label: 'Até R$ 1.500', min: null, max: 150_000 },
  { label: 'R$ 1.500 a 2.500', min: 150_000, max: 250_000 },
  { label: 'Acima de R$ 2.500', min: 250_000, max: null },
] as const;

export function FilterChip({ filter, onRemove }: { filter: ActiveFilter; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-card py-0.5 pr-1 pl-2.5 text-[12.5px]">
      <span className="text-[11px] text-muted-foreground">{filter.label}</span>
      <span className="truncate">{filter.value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover ${filter.label.toLowerCase()}: ${filter.value}`}
        className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
      >
        <XIcon className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}

type FiltersProps = {
  tab: ShowcaseTab;
  filters: Filters;
  departments: Facet[];
  artists: Facet[];
  onChange: (next: Partial<Filters>) => void;
};

/** Seções da coluna de filtros; a mesma lista serve a coluna do desktop e a tela cheia do celular. */
export function ShowcaseFilters({ tab, filters, departments, artists, onChange }: FiltersProps) {
  return (
    <div className="grid gap-7">
      <FilterGroup title="Departamento">
        <FacetIndex
          allLabel="Todos"
          items={departments}
          value={filters.department}
          onSelect={(department) => onChange({ department })}
        />
      </FilterGroup>
      <FilterGroup title="Artista">
        <ArtistFilter artists={artists} value={filters.artist} onSelect={(artist) => onChange({ artist })} />
      </FilterGroup>
      <FilterGroup title={tab.priceLabel}>
        <PriceFilter
          key={`${filters.minPrice}:${filters.maxPrice}`}
          label={tab.priceLabel}
          min={filters.minPrice}
          max={filters.maxPrice}
          onChange={onChange}
        />
      </FilterGroup>
      <FilterGroup title={tab.periodLabel}>
        <PeriodFilter tab={tab} value={filters.period} onChange={(period) => onChange({ period })} />
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="grid gap-2.5">
      <h3 id={id} className="text-[11px] font-bold tracking-[0.09em] text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

/** Lista de índice de catálogo: um item escolhido por vez, marcado por um ponto bordô. */
function FacetIndex({
  allLabel,
  items,
  value,
  onSelect,
}: {
  allLabel: string;
  items: Facet[];
  value: string;
  onSelect: (name: string) => void;
}) {
  const rows: { name: string; count?: number }[] = [{ name: '' }, ...items];
  return (
    <ul className="grid">
      {rows.map(({ name, count }) => {
        const on = name === value;
        return (
          <li key={name || allLabel}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(on ? '' : name)}
              className={cn(
                'relative flex w-full items-center justify-between gap-3 py-2 pl-3.5 text-left text-[14px] text-muted-foreground transition-colors hover:text-foreground lg:py-1.25 lg:text-[13.5px]',
                on && 'font-semibold text-foreground',
              )}
            >
              {on && <span aria-hidden="true" className="absolute top-1/2 left-0 size-1.5 -translate-y-1/2 rounded-full bg-primary" />}
              <span className="min-w-0 truncate">{name || allLabel}</span>
              {count !== undefined && <span className="font-mono text-[11.5px] font-normal text-muted-foreground">{count}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ArtistFilter({ artists, value, onSelect }: { artists: Facet[]; value: string; onSelect: (name: string) => void }) {
  const [term, setTerm] = useState('');
  const [expanded, setExpanded] = useState(false);
  const needle = term.trim().toLocaleLowerCase(LOCALE);
  const matches = needle ? artists.filter((artist) => artist.name.toLocaleLowerCase(LOCALE).includes(needle)) : artists;
  const shown = expanded || needle ? matches : matches.slice(0, ARTIST_PREVIEW);
  // O artista escolhido continua visível mesmo fora da prévia ou da aba atual.
  const selected = value && !shown.some((artist) => artist.name === value) ? [{ name: value, count: 0 }] : [];

  return (
    <div className="grid gap-2">
      {artists.length > ARTIST_PREVIEW && (
        <label className="flex h-9 items-center gap-2 rounded-lg border border-input bg-card px-2.5 text-muted-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <SearchIcon className="size-3.5 shrink-0" aria-hidden="true" />
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Buscar artista"
            aria-label="Buscar artista"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-none"
          />
        </label>
      )}
      {needle && matches.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Nenhum artista com “{term.trim()}”.</p>
      ) : (
        <FacetIndex allLabel="Todos" items={[...selected, ...shown]} value={value} onSelect={onSelect} />
      )}
      {!needle && artists.length > ARTIST_PREVIEW && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="justify-self-start text-[12.5px] text-muted-foreground underline underline-offset-3 hover:text-foreground"
        >
          {expanded ? 'Mostrar menos' : `Ver todos os ${artists.length}`}
        </button>
      )}
    </div>
  );
}

const inputText = (cents: number | null) =>
  cents === null ? '' : cents % 100 === 0 ? (cents / 100).toLocaleString(LOCALE) : formatMoneyInput(cents);

/** Os campos só mudam a URL ao sair deles ou com Enter, não a cada tecla. */
function PriceFilter({
  label,
  min,
  max,
  onChange,
}: {
  label: string;
  min: number | null;
  max: number | null;
  onChange: (next: Partial<Filters>) => void;
}) {
  const [from, setFrom] = useState(inputText(min));
  const [to, setTo] = useState(inputText(max));
  const parsedFrom = from.trim() ? parseMoney(from) : null;
  const parsedTo = to.trim() ? parseMoney(to) : null;
  const invalidFrom = from.trim() !== '' && parsedFrom === null;
  const invalidTo = to.trim() !== '' && parsedTo === null;

  function commit() {
    if (invalidFrom || invalidTo) return;
    let low = parsedFrom;
    let high = parsedTo;
    if (low !== null && high !== null && low > high) [low, high] = [high, low];
    if (low !== min || high !== max) onChange({ minPrice: low, maxPrice: high });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    commit();
  }

  const field = (value: string, setValue: (text: string) => void, invalid: boolean, placeholder: string, bound: string) => (
    <label
      className={cn(
        'flex h-9 min-w-0 items-center gap-1.5 rounded-lg border border-input bg-card px-2.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
        invalid && 'border-destructive',
      )}
    >
      <span className="text-xs text-muted-foreground">R$</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        placeholder={placeholder}
        aria-label={`${label} ${bound}`}
        aria-invalid={invalid}
        className="w-full min-w-0 bg-transparent font-mono text-[13px] tabular-nums outline-none placeholder:text-muted-foreground focus-visible:outline-none"
      />
    </label>
  );

  return (
    <form onSubmit={submit} className="grid gap-2.5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
        {field(from, setFrom, invalidFrom, '0', 'mínimo')}
        <span className="text-xs text-muted-foreground">até</span>
        {field(to, setTo, invalidTo, 'sem limite', 'máximo')}
      </div>
      {(invalidFrom || invalidTo) && <p className="text-xs text-destructive">Use só números, como 1.500 ou 1500,50.</p>}
      <div className="flex flex-wrap gap-1.5">
        {PRICE_PRESETS.map((preset) => {
          const on = preset.min === min && preset.max === max;
          return (
            <button
              key={preset.label}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? { minPrice: null, maxPrice: null } : { minPrice: preset.min, maxPrice: preset.max })}
              className={cn(
                'h-7 rounded-full border bg-card px-2.5 text-[12.5px] whitespace-nowrap transition-colors hover:border-primary/60',
                on && 'border-transparent bg-primary-soft font-semibold text-primary',
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <button type="submit" hidden />
    </form>
  );
}

function PeriodFilter({ tab, value, onChange }: { tab: ShowcaseTab; value: LotPeriod | null; onChange: (period: LotPeriod | null) => void }) {
  const name = useId();
  const options: (LotPeriod | null)[] = [null, ...Object.values(LotPeriod)];
  return (
    <div className="grid gap-0.5">
      {options.map((period) => (
        <label key={period ?? 'any'} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[14px] lg:py-1 lg:text-[13.5px]">
          <input
            type="radio"
            name={name}
            checked={value === period}
            onChange={() => onChange(period)}
            className="size-4 accent-primary"
          />
          {period ? tab.periods[period] : 'Qualquer momento'}
        </label>
      ))}
    </div>
  );
}

/** Celular: botão só com ícone e contador; abre os filtros em tela cheia e aplica na hora. */
export function FiltersScreen({
  activeCount,
  total,
  onClear,
  children,
}: {
  activeCount: number;
  total: number | null;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={activeCount ? `Filtros, ${activeCount} ativos` : 'Filtros'}
          className={cn('relative size-9 shrink-0 bg-card px-0', activeCount > 0 && 'border-primary text-primary')}
        >
          <ListFilterIcon aria-hidden="true" />
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-primary px-1 font-mono text-[10.5px] text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 grid grid-rows-[auto_1fr_auto] bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] data-[state=open]:animate-page-in"
        >
          <header className="flex items-center gap-2 border-b px-2 py-2">
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="icon-lg" aria-label="Voltar para a vitrine">
                <ArrowLeftIcon aria-hidden="true" />
              </Button>
            </Dialog.Close>
            <Dialog.Title className="flex-1 text-[17px] font-bold">Filtros</Dialog.Title>
            {activeCount > 0 && (
              <Button type="button" variant="link" onClick={onClear}>
                Limpar
              </Button>
            )}
          </header>
          <div className="overflow-y-auto px-5 py-5">{children}</div>
          <footer className="border-t px-4 py-3">
            <Dialog.Close asChild>
              <Button type="button" className="h-11 w-full text-[15px]">
                {total === null ? 'Ver obras' : `Ver ${total} ${total === 1 ? 'obra' : 'obras'}`}
              </Button>
            </Dialog.Close>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

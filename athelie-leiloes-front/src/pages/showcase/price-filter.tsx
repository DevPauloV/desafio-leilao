import { useState, type FormEvent } from 'react';
import { cn } from 'cn';
import { LOCALE } from '@/constants';
import { formatMoneyInput, parseMoney } from '@/lib/money';
import type { Filters } from './tabs';

/** Faixas pensadas para os valores dos lotes do seed (R$ 400 a R$ 3.350). */
const PRICE_PRESETS = [
  { label: 'Até R$ 1.500', min: null, max: 150_000 },
  { label: 'R$ 1.500 a 2.500', min: 150_000, max: 250_000 },
  { label: 'Acima de R$ 2.500', min: 250_000, max: null },
] as const;

const inputText = (cents: number | null) =>
  cents === null ? '' : cents % 100 === 0 ? (cents / 100).toLocaleString(LOCALE) : formatMoneyInput(cents);

/** Os campos só mudam a URL ao sair deles ou com Enter, não a cada tecla. */
export function PriceFilter({
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

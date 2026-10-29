import { useId } from 'react';
import { STATUS_OPTIONS, type StatusFilter } from './lot-filter';

export function StatusRadios({
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

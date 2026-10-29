import { useId } from 'react';

/** Grupo de opções únicas para a tela cheia de filtros do celular. */
export function RadioOptions<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="grid gap-0.5">
      <legend className="mb-2 text-[11px] font-bold tracking-[0.09em] text-muted-foreground uppercase">{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className="flex cursor-pointer items-center gap-2.5 py-2 text-[15px]">
          <input type="radio" name={name} checked={value === option.value} onChange={() => onChange(option.value)} className="size-4 accent-primary" />
          <span className="flex-1">{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

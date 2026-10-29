import { useId } from 'react';
import { LotPeriod } from '@/constants';
import type { ShowcaseTab } from './tabs';

export function PeriodFilter({ tab, value, onChange }: { tab: ShowcaseTab; value: LotPeriod | null; onChange: (period: LotPeriod | null) => void }) {
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

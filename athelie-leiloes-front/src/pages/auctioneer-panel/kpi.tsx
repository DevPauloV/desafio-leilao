import { cn } from 'cn';
import { Bone } from '@/components/skeleton';

/** `value` nulo = ainda carregando: o bloco ocupa a mesma altura do número. */
export function Kpi({
  label,
  value,
  boneClassName,
  valueClassName,
}: {
  label: string;
  value: string | null;
  boneClassName: string;
  valueClassName?: string;
}) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('flex h-9 items-center text-[22px] leading-none font-bold tracking-tight whitespace-nowrap tabular-nums sm:text-[28px]', valueClassName)}>
        {value ?? <Bone className={cn('h-7 rounded-md', boneClassName)} />}
      </dd>
    </div>
  );
}

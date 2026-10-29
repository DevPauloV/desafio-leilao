import { cn } from 'cn';
import { MoonIcon, SunIcon, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Theme } from '@/constants';
import { setTheme, useTheme, type ResolvedTheme } from '@/lib/theme';

const THEME_OPTIONS: { value: ResolvedTheme; label: string; icon: LucideIcon }[] = [
  { value: Theme.LIGHT, label: 'Claro', icon: SunIcon },
  { value: Theme.DARK, label: 'Escuro', icon: MoonIcon },
];

export function ThemeButton({ className }: { className?: string }) {
  const { resolved } = useTheme();
  const [current, next] = resolved === Theme.LIGHT ? THEME_OPTIONS : [...THEME_OPTIONS].reverse();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('size-11 text-muted-foreground', className)}
      onClick={() => setTheme(next.value)}
      aria-label={`Tema: ${current.label.toLowerCase()}. Trocar para ${next.label.toLowerCase()}`}
      title={`Trocar para tema ${next.label.toLowerCase()}`}
    >
      <current.icon />
    </Button>
  );
}

export function ThemeChoice() {
  const { resolved } = useTheme();
  return (
    <div className="grid gap-1.5 px-1 pt-1.5 pb-2">
      <span className="px-1.5 text-xs text-muted-foreground">Tema</span>
      <div role="group" aria-label="Tema" className="grid grid-cols-2 gap-0.5 rounded-[10px] bg-muted p-0.75">
        {THEME_OPTIONS.map((option) => {
          const active = option.value === resolved;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setTheme(option.value)}
              className={cn(
                'flex h-10 items-center justify-center gap-1.5 rounded-lg text-[13.5px] transition-colors',
                active ? 'bg-card font-semibold text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <option.icon className="size-3.75" aria-hidden="true" />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

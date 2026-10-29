import { cn } from 'cn';
import { setTheme, useTheme } from '@/lib/theme';
import { THEME_OPTIONS } from './theme-options';

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

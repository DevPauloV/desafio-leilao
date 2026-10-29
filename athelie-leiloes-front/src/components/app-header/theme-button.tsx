import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Theme } from '@/constants';
import { setTheme, useTheme } from '@/lib/theme';
import { THEME_OPTIONS } from './theme-options';

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

import { MoonIcon, SunIcon, type LucideIcon } from 'lucide-react';
import { Theme } from '@/constants';
import type { ResolvedTheme } from '@/lib/theme';

export const THEME_OPTIONS: { value: ResolvedTheme; label: string; icon: LucideIcon }[] = [
  { value: Theme.LIGHT, label: 'Claro', icon: SunIcon },
  { value: Theme.DARK, label: 'Escuro', icon: MoonIcon },
];

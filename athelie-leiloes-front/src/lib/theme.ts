import { useSyncExternalStore } from 'react';
import { STORAGE_KEYS, Theme } from '@/constants';

// O index.html já aplica a classe `dark` antes do primeiro paint (sem piscar); aqui ficam a troca e o acompanhamento.

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set<() => void>();

function readSaved(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === Theme.LIGHT || saved === Theme.DARK) return saved;
  } catch {
    // localStorage bloqueado: segue o sistema
  }
  return Theme.SYSTEM;
}

const DARK_CLASS = 'dark';

let preference: Theme = readSaved();

const isDark = () => preference === Theme.DARK || (preference === Theme.SYSTEM && darkQuery.matches);

function apply() {
  document.documentElement.classList.toggle(DARK_CLASS, isDark());
  listeners.forEach((listener) => listener());
}

darkQuery.addEventListener('change', () => {
  if (preference === Theme.SYSTEM) apply();
});

export type ResolvedTheme = typeof Theme.LIGHT | typeof Theme.DARK;

export function setTheme(theme: ResolvedTheme): void {
  preference = theme;
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch {
    // a escolha vale só nesta aba
  }
  apply();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme(): { resolved: ResolvedTheme } {
  const dark = useSyncExternalStore(subscribe, isDark);
  return { resolved: dark ? Theme.DARK : Theme.LIGHT };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from './api';

/** Abaixo disso o loader nem aparece; depois de aparecer, fica o mínimo para não virar um flash. */
const LOADER_DELAY_MS = 200;
const LOADER_MIN_VISIBLE_MS = 400;
/** Tempo do fade de saída do splash; igual a `--animate-splash-out` do index.css. */
const LOADER_EXIT_MS = 300;

export function useLoaderVisible(active: boolean): boolean {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (active && !visible) {
      const timer = setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, LOADER_DELAY_MS);
      return () => clearTimeout(timer);
    }
    if (!active && visible) {
      const remaining = LOADER_MIN_VISIBLE_MS - (Date.now() - shownAt.current);
      const timer = setTimeout(() => setVisible(false), Math.max(remaining, LOADER_EXIT_MS));
      return () => clearTimeout(timer);
    }
  }, [active, visible]);

  return visible;
}

// Última resposta de cada página do usuário logado; limpa no login e no logout.
const pageCache = new Map<string, unknown>();

export function clearPageCache(): void {
  pageCache.clear();
}

/** Abre com a última resposta de `path` (voltar a uma aba é instantâneo) e busca a versão nova em seguida. */
export function usePageData<T>(path: string) {
  const [data, setData] = useState<T | null>(() => (pageCache.get(path) as T | undefined) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal }).then(
      (fresh) => {
        pageCache.set(path, fresh);
        setData(fresh);
        setError(null);
      },
      (err: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(err));
      },
    );
    return () => controller.abort();
  }, [path, reloadCount]);

  const reload = useCallback(() => {
    setError(null);
    setReloadCount((n) => n + 1);
  }, []);

  return { data, error, reload };
}

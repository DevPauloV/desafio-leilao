import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';

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

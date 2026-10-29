import { useEffect, useState } from 'react';
import type { SetURLSearchParams } from 'react-router';
import { Param } from './url-filters';

const SEARCH_DEBOUNCE_MS = 300;

export function useDebouncedSearch(q: string, setParams: SetURLSearchParams) {
  // O campo só vai para a URL após o debounce, mas acompanha a URL se ela mudar por fora (voltar, "Limpar filtros").
  const [typed, setTyped] = useState(q);
  const [lastUrlQuery, setLastUrlQuery] = useState(q);
  if (q !== lastUrlQuery) {
    setLastUrlQuery(q);
    setTyped(q);
  }

  // `replace`: não cria uma entrada no histórico a cada pausa na digitação.
  useEffect(() => {
    const term = typed.trim();
    if (term === q) return;
    const timer = setTimeout(() => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (term) next.set(Param.QUERY, term);
          else next.delete(Param.QUERY);
          next.delete(Param.PAGE);
          return next;
        },
        { replace: true },
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [typed, q, setParams]);

  return [typed, setTyped] as const;
}

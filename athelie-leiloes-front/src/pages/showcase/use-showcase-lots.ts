import { useEffect, useState } from 'react';
import type { SetURLSearchParams } from 'react-router';
import { LOTS_PAGE_SIZE } from '@/constants';
import { api, errorMessage } from '@/lib/api';
import { clockOffset } from '@/lib/time';
import type { LotPage } from '@/types';
import { TABS, type ShowcaseStatus } from './tabs';
import { Param, filtersFromParams, lotsUrl } from './url-filters';

/** `offset` é medido na chegada da resposta: a contagem regressiva continua certa quando ela volta do cache. */
type ShowcaseResponse = { key: string; status: ShowcaseStatus; data?: LotPage; offset?: number; error?: string };

// Voltar à vitrine abre com a última lista na tela enquanto a nova chega. Dados públicos: não depende do usuário.
const lastVisit: {
  response: ShowcaseResponse | null;
  counts: Partial<Record<ShowcaseStatus, number>>;
} = { response: null, counts: {} };

export function useShowcaseLots(status: ShowcaseStatus, page: number, filtersKey: string, setParams: SetURLSearchParams) {
  const [reload, setReload] = useState(0);
  const [counts, setCounts] = useState(lastVisit.counts);
  // A resposta guarda a chave da busca que a gerou: chave diferente da atual = carregando.
  const requestKey = `${status}:${page}:${filtersKey}:${reload}`;
  const [response, setResponse] = useState(lastVisit.response);

  useEffect(() => {
    const controller = new AbortController();
    api<LotPage>(lotsUrl(status, filtersFromParams(new URLSearchParams(filtersKey)), page), { signal: controller.signal }).then(
      (data) => {
        const fresh = { key: requestKey, status, data, offset: clockOffset(data.serverTime) };
        lastVisit.response = fresh;
        setResponse(fresh);
      },
      (err: unknown) => {
        if (!controller.signal.aborted) setResponse({ key: requestKey, status, error: errorMessage(err) });
      },
    );
    return () => controller.abort();
  }, [status, page, filtersKey, requestKey]);

  useEffect(() => {
    const controller = new AbortController();
    const current = filtersFromParams(new URLSearchParams(filtersKey));
    for (const other of TABS) {
      api<LotPage>(lotsUrl(other.status, current), { signal: controller.signal })
        .then((result) => {
          lastVisit.counts = { ...lastVisit.counts, [other.status]: result.total };
          setCounts(lastVisit.counts);
        })
        .catch(() => {}); // contador é opcional; a aba ativa mostra o próprio erro
    }
    return () => controller.abort();
  }, [filtersKey]);

  const current = response?.key === requestKey ? response : null;
  const loading = current === null;
  const error = current?.error ?? null;
  // Enquanto a busca nova carrega, a lista anterior da mesma aba continua na tela (sem piscar).
  const data = current?.data ?? (response?.status === status ? (response.data ?? null) : null);
  const offset = response?.offset ?? 0;

  // Página além da última (link antigo): volta para a última, senão a lista fica vazia e a paginação some.
  const freshTotal = current?.data?.total;
  useEffect(() => {
    if (freshTotal === undefined) return;
    const lastPage = Math.max(1, Math.ceil(freshTotal / LOTS_PAGE_SIZE));
    if (page <= lastPage) return;
    setParams(
      (currentParams) => {
        const next = new URLSearchParams(currentParams);
        if (lastPage > 1) next.set(Param.PAGE, String(lastPage));
        else next.delete(Param.PAGE);
        return next;
      },
      { replace: true },
    );
  }, [freshTotal, page, setParams]);

  return { counts, loading, error, data, offset, retry: () => setReload((n) => n + 1) };
}

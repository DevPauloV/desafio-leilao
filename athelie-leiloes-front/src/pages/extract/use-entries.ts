import { useCallback, useEffect, useState } from 'react';
import { SocketEvent, type EntryFilter, type EntryPeriod } from '@/constants';
import { useSocketEvent } from '@/hooks/use-socket-event';
import { api, errorMessage } from '@/lib/api';
import type { EntriesResponse, WalletEntry } from '@/types';

type State = { items: WalletEntry[]; total: number; pageSize: number };

/** Primeira página do filtro; `loadMore` acrescenta a próxima. Um lance novo relê a primeira página. */
export function useEntries(type: EntryFilter, period: EntryPeriod) {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  const path = (page: number) => `/api/wallet/entries?type=${type}&period=${period}&page=${page}`;

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    api<EntriesResponse>(path(1), { signal: controller.signal }).then(setState, (err: unknown) => {
      if (!controller.signal.aborted) setError(errorMessage(err));
    });
    return () => controller.abort();
  }, [type, period, reloadCount]);

  // Trocar o filtro mostra o esqueleto em vez da lista do filtro anterior.
  useEffect(() => setState(null), [type, period]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);
  useSocketEvent(SocketEvent.WALLET_UPDATE, reload);

  async function loadMore() {
    if (!state) return;
    setLoadingMore(true);
    try {
      const next = await api<EntriesResponse>(path(Math.floor(state.items.length / state.pageSize) + 1));
      setState({ ...next, items: [...state.items, ...next.items] });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  return { ...state, loading: state === null && error === null, error, loadingMore, loadMore, reload };
}

import { useEffect, useState } from 'react';
import { Role } from '@/constants';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { AuditView, LotDetail } from '@/types';

export function useAudit(id: string) {
  const { user } = useAuth();
  const isBidder = user?.role === Role.BIDDER;
  const [reload, setReload] = useState(0);
  const requestKey = `${id}:${reload}`;
  const [response, setResponse] = useState<{ key: string; audit?: AuditView; error?: string } | null>(null);
  // Guarda a última auditoria para "Verificar de novo" não apagar a tela enquanto confere.
  const [audit, setAudit] = useState<AuditView | null>(null);
  const [myPseudonym, setMyPseudonym] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api<AuditView>(`/api/audit/lots/${encodeURIComponent(id)}`, { signal: controller.signal }).then(
      (data) => {
        setAudit(data);
        setResponse({ key: requestKey, audit: data });
      },
      (err: unknown) => {
        if (!controller.signal.aborted) setResponse({ key: requestKey, error: errorMessage(err) });
      },
    );
    return () => controller.abort();
  }, [id, requestKey]);

  // A auditoria não identifica o usuário: o pseudônimo dele vem do lote (`me`), para marcar "Você".
  useEffect(() => {
    if (!isBidder) return;
    const controller = new AbortController();
    api<LotDetail>(`/api/lots/${encodeURIComponent(id)}`, { signal: controller.signal }).then(
      (lot) => setMyPseudonym(lot.me?.pseudonym ?? null),
      () => {}, // sem o pseudônimo, a tabela só não marca "Você"
    );
    return () => controller.abort();
  }, [id, isBidder]);

  const checking = response?.key !== requestKey;
  const error = response?.key === requestKey ? response.error : undefined;
  const current = audit?.lot.id === id ? audit : null;

  return { checking, error, current, myPseudonym, recheck: () => setReload((n) => n + 1) };
}

import { matchPath, useLocation } from 'react-router';
import { PAGE_LABELS, ROUTES, lotPath } from '@/constants';
import { useCrumbLotValue } from '@/hooks/use-crumb-lot';

export type Crumb = { label: string; to?: string };

const LOT_FALLBACK_LABEL = 'Lote';
const AUDIT_LABEL = 'Auditoria';
const RECEIPT_LABEL = 'Comprovante';

const HOME: Crumb = { label: PAGE_LABELS[ROUTES.SHOWCASE], to: ROUTES.SHOWCASE };

const SINGLE_LEVEL_ROUTES = [ROUTES.WALLET, ROUTES.MY_BIDS, ROUTES.AUCTIONEER_PANEL] as const;

export function useTrail(): Crumb[] | null {
  const { pathname } = useLocation();
  const lot = useCrumbLotValue();

  for (const route of SINGLE_LEVEL_ROUTES) {
    if (matchPath(route, pathname)) return [HOME, { label: PAGE_LABELS[route] }];
  }
  const lotCrumb = (id: string | undefined): Crumb => ({ label: lot?.title ?? LOT_FALLBACK_LABEL, to: id ? lotPath(id) : undefined });
  if (matchPath(ROUTES.LOT, pathname)) return [HOME, { label: lot?.title ?? LOT_FALLBACK_LABEL }];
  const audit = matchPath(ROUTES.AUDIT, pathname);
  if (audit) return [HOME, lotCrumb(audit.params.id), { label: AUDIT_LABEL }];
  if (matchPath(ROUTES.RECEIPT, pathname)) return [HOME, lotCrumb(lot?.id), { label: RECEIPT_LABEL }];
  return null;
}

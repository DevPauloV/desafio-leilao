import { ROUTES, Role } from '@/constants';

export type NavItem = { to: string; label: string; end?: boolean };

export function navItems(role: Role | undefined): NavItem[] {
  const items: NavItem[] = [{ to: ROUTES.SHOWCASE, label: 'Leilões', end: true }];
  if (role === Role.BIDDER) {
    items.push({ to: ROUTES.MY_BIDS, label: 'Meus arremates' }, { to: ROUTES.WALLET, label: 'Carteira' });
  }
  if (role === Role.AUCTIONEER) items.push({ to: ROUTES.AUCTIONEER_PANEL, label: 'Painel do leiloeiro' });
  return items;
}

import { PAGE_LABELS, ROUTES, Role } from '@/constants';

export type NavItem = { to: string; label: string; end?: boolean };

export function navItems(role: Role | undefined): NavItem[] {
  const items: NavItem[] = [{ to: ROUTES.SHOWCASE, label: PAGE_LABELS[ROUTES.SHOWCASE], end: true }];
  if (role === Role.BIDDER) {
    items.push(
      { to: ROUTES.MY_BIDS, label: PAGE_LABELS[ROUTES.MY_BIDS] },
      { to: ROUTES.WALLET, label: PAGE_LABELS[ROUTES.WALLET] },
    );
  }
  if (role === Role.AUCTIONEER) items.push({ to: ROUTES.AUCTIONEER_PANEL, label: PAGE_LABELS[ROUTES.AUCTIONEER_PANEL] });
  return items;
}

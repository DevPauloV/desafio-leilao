import { AwardIcon, GavelIcon, LayoutGridIcon, WalletIcon, type LucideIcon } from 'lucide-react';
import { ROUTES, Role } from '@/constants';

export type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };

export function navItems(role: Role | undefined): NavItem[] {
  const items: NavItem[] = [{ to: ROUTES.SHOWCASE, label: 'Vitrine', icon: LayoutGridIcon, end: true }];
  if (role === Role.BIDDER) {
    items.push({ to: ROUTES.MY_BIDS, label: 'Meus arremates', icon: AwardIcon }, { to: ROUTES.WALLET, label: 'Carteira', icon: WalletIcon });
  }
  if (role === Role.AUCTIONEER) items.push({ to: ROUTES.AUCTIONEER_PANEL, label: 'Painel do leiloeiro', icon: GavelIcon });
  return items;
}

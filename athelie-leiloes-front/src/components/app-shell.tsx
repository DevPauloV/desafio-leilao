import { Route, Routes, useLocation } from 'react-router';
import { AppHeader } from '@/components/app-header';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { RequireRole } from '@/components/require-role';
import { Toaster } from '@/components/ui/sonner';
import { ROUTE_ROLES, ROUTES } from '@/constants';
import { AuctioneerPanelPage } from '@/pages/auctioneer-panel';
import { AuditPage } from '@/pages/audit';
import { LoginPage } from '@/pages/login';
import { LotRoomPage } from '@/pages/lot-room';
import { MyBidsPage } from '@/pages/my-bids';
import { NotFoundPage } from '@/pages/not-found';
import { ReceiptPage } from '@/pages/receipt';
import { RegisterPage } from '@/pages/register';
import { ShowcasePage } from '@/pages/showcase';
import { WalletPage } from '@/pages/wallet';

export function AppShell() {
  const { pathname } = useLocation();
  return (
    <div className="mx-auto max-w-300 px-4 pb-14">
      <AppHeader />
      <Breadcrumbs />
      <main key={pathname} className="animate-page-in motion-reduce:animate-none">
        <Routes>
          <Route path={ROUTES.SHOWCASE} element={<ShowcasePage />} />
          <Route path={ROUTES.LOT} element={<LotRoomPage />} />
          <Route
            path={ROUTES.WALLET}
            element={
              <RequireRole role={ROUTE_ROLES[ROUTES.WALLET]}>
                <WalletPage />
              </RequireRole>
            }
          />
          <Route path={ROUTES.RECEIPT} element={<ReceiptPage />} />
          <Route path={ROUTES.AUDIT} element={<AuditPage />} />
          <Route
            path={ROUTES.MY_BIDS}
            element={
              <RequireRole role={ROUTE_ROLES[ROUTES.MY_BIDS]}>
                <MyBidsPage />
              </RequireRole>
            }
          />
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
          <Route
            path={ROUTES.AUCTIONEER_PANEL}
            element={
              <RequireRole role={ROUTE_ROLES[ROUTES.AUCTIONEER_PANEL]}>
                <AuctioneerPanelPage />
              </RequireRole>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Toaster position="top-center" />
    </div>
  );
}

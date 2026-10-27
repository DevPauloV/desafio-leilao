import type { ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { ROUTE_ROLES, ROUTES, Role } from '@/constants';
import { useAuth } from '@/lib/auth';
import { usePersonalEvents } from '@/lib/socket';
import { AuctioneerPanelPage } from '@/pages/auctioneer-panel';
import { AuditPage } from '@/pages/audit';
import { LoginPage } from '@/pages/login';
import { LotRoomPage } from '@/pages/lot-room';
import { MyBidsPage } from '@/pages/my-bids';
import { ReceiptPage } from '@/pages/receipt';
import { RegisterPage } from '@/pages/register';
import { ShowcasePage } from '@/pages/showcase';
import { WalletPage } from '@/pages/wallet';

/** Rota só para quem está logado com o papel certo. Sem login, vai para "Entrar" e volta depois. */
function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="pt-7 text-muted-foreground" role="status">Carregando…</p>;
  if (!user) return <Navigate to={ROUTES.LOGIN} replace state={{ from: location.pathname }} />;
  if (user.role !== role) {
    return (
      <div className="grid gap-2 pt-7">
        <h1 className="text-3xl font-bold tracking-tight">Página restrita</h1>
        <p className="text-muted-foreground">
          Esta página é só para {role === Role.AUCTIONEER ? 'leiloeiros' : 'licitantes'}.{' '}
          <Link to={ROUTES.SHOWCASE} className="text-primary underline-offset-4 hover:underline">
            Ir para a vitrine
          </Link>
        </p>
      </div>
    );
  }
  return children;
}

/** Centralizada no espaço abaixo do cabeçalho, como o cartão de entrar. */
function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  // "default" é a primeira entrada do app nesta aba: sem página anterior dentro do app, o botão de voltar some.
  const hasPrevious = location.key !== 'default';
  return (
    <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col items-center justify-center gap-5 py-10 text-center md:min-h-[calc(100dvh-8.5rem)]">
      <span className="text-xs font-bold tracking-[0.22em] text-primary uppercase">Erro 404</span>
      <h1 className="text-[clamp(32px,5vw,44px)] leading-[1.08] font-extrabold tracking-[-0.035em]">Página não encontrada</h1>
      <p className="max-w-110 text-base text-muted-foreground">
        O endereço pode ter mudado, ou o lote que você procura não existe mais.
      </p>
      <div className="mt-1 flex flex-wrap justify-center gap-2.5">
        <Button asChild className="h-11 px-5 text-[14.5px]">
          <Link to={ROUTES.SHOWCASE}>Voltar para a vitrine</Link>
        </Button>
        {hasPrevious && (
          <Button type="button" variant="outline" className="h-11 bg-card px-5 text-[14.5px]" onClick={() => navigate(-1)}>
            Voltar à página anterior
          </Button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  usePersonalEvents();
  return (
    <div className="mx-auto max-w-300 px-4 pb-14">
      <AppHeader />
      <main>
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Toaster position="top-center" />
    </div>
  );
}

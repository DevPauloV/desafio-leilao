import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { ROUTES, Role } from '@/constants';
import { useAuth } from '@/lib/auth';

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
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

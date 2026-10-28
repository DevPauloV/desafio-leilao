import { Link, useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';

export function NotFoundPage() {
  const location = useLocation();
  const navigate = useNavigate();
  // "default" = primeira entrada do app nesta aba: não há página anterior para voltar.
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

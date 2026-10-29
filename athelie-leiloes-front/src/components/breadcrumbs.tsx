import { Fragment } from 'react';
import { ChevronRightIcon, HouseIcon } from 'lucide-react';
import { Link, matchPath, useLocation } from 'react-router';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PAGE_LABELS, ROUTES, lotPath } from '@/constants';
import { useCrumbLotValue } from '@/lib/crumb-lot';

type Crumb = { label: string; to?: string };

const LOT_FALLBACK_LABEL = 'Lote';
const AUDIT_LABEL = 'Auditoria';
const RECEIPT_LABEL = 'Comprovante';

const HOME: Crumb = { label: PAGE_LABELS[ROUTES.SHOWCASE], to: ROUTES.SHOWCASE };

const SINGLE_LEVEL_ROUTES = [ROUTES.WALLET, ROUTES.MY_BIDS, ROUTES.AUCTIONEER_PANEL] as const;

function useTrail(): Crumb[] | null {
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

const linkClass = 'inline-flex min-h-8 items-center gap-1.5 rounded-sm whitespace-nowrap text-muted-foreground no-underline hover:text-primary hover:underline';

/** Onde o usuário está e como voltar. No celular, os níveis do meio viram "…". */
export function Breadcrumbs() {
  const trail = useTrail();
  if (!trail) return null;

  const middle = trail.slice(1, -1);
  return (
    <nav aria-label="Você está em" className="-mb-3 pt-5 text-[13px]">
      <ol className="flex min-w-0 items-center gap-1">
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1;
          const hiddenOnPhone = index > 0 && !last;
          return (
            <Fragment key={`${index}:${crumb.label}`}>
              {index === 1 && middle.length > 0 && (
                <>
                  <Separator className="md:hidden" />
                  <HiddenLevels crumbs={middle} />
                </>
              )}
              {index > 0 && <Separator className={hiddenOnPhone ? 'hidden md:block' : undefined} />}
              <li className={hiddenOnPhone ? 'hidden min-w-0 md:block' : 'min-w-0'}>
                {last ? (
                  <span aria-current="page" className="block truncate font-semibold">
                    {crumb.label}
                  </span>
                ) : (
                  <Link to={crumb.to ?? ROUTES.SHOWCASE} className={linkClass}>
                    {index === 0 && <HouseIcon aria-hidden="true" className="size-3.5" />}
                    {crumb.label}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

function Separator({ className }: { className?: string }) {
  return (
    <li aria-hidden="true" className={className ?? 'flex'}>
      <ChevronRightIcon className="size-3.5 flex-none text-muted-foreground/70" />
    </li>
  );
}

function HiddenLevels({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <li className="md:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Mostrar níveis ocultos"
            className="min-h-8 rounded-sm bg-secondary px-2 font-bold text-muted-foreground outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            …
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-w-[80vw]">
          {crumbs.map((crumb) => (
            <DropdownMenuItem key={crumb.label} asChild>
              <Link to={crumb.to ?? ROUTES.SHOWCASE}>{crumb.label}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

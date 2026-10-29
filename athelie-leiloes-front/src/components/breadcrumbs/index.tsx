import { Fragment } from 'react';
import { HouseIcon } from 'lucide-react';
import { Link } from 'react-router';
import { ROUTES } from '@/constants';
import { useTrail } from '@/hooks/use-trail';
import { HiddenLevels } from './hidden-levels';
import { Separator } from './separator';

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

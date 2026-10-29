import { Link } from 'react-router';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ROUTES } from '@/constants';
import type { Crumb } from '@/hooks/use-trail';

export function HiddenLevels({ crumbs }: { crumbs: Crumb[] }) {
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

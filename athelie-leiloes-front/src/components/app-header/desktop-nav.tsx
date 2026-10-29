import { NavLink } from 'react-router';
import { cn } from 'cn';
import { navLinkClass } from './nav-classes';
import type { NavItem } from './nav-items';

export function DesktopNav({ items }: { items: NavItem[] }) {
  return (
    <nav aria-label="Navegação do app" className="hidden gap-9 md:flex">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={cn(navLinkClass, 'py-3.5')}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

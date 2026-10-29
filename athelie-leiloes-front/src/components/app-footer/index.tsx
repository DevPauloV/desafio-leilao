import { Wordmark } from '@/components/app-header/wordmark';
import { SOCIAL_LINKS } from '@/constants';
import { GithubIcon } from './github-icon';
import { LinkedinIcon } from './linkedin-icon';

const iconLinkClass =
  'inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export function AppFooter() {
  return (
    <footer className="mt-14 flex flex-col items-center gap-3.5 border-t py-5 text-center text-[13px] text-muted-foreground md:flex-row md:justify-between md:text-left">
      <Wordmark compact />
      <p>© {new Date().getFullYear()} Athelie Leilões. Todos os direitos reservados.</p>
      <nav aria-label="Contato" className="flex items-center gap-1.5">
        <a href={SOCIAL_LINKS.GITHUB} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className={iconLinkClass}>
          <GithubIcon />
        </a>
        <a href={SOCIAL_LINKS.LINKEDIN} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className={iconLinkClass}>
          <LinkedinIcon />
        </a>
      </nav>
    </footer>
  );
}

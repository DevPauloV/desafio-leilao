import { cn } from 'cn';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, Role } from '@/constants';

// Celular: três botões em linha. Desktop: lista com e-mail ao lado do formulário.
export function DemoAccounts({ onPick }: { onPick: (email: string) => void }) {
  return (
    <section aria-labelledby="demo-title" className="grid gap-2.5 md:gap-3 md:rounded-[10px] md:border md:border-dashed md:bg-card md:p-5">
      <p className="text-xs text-muted-foreground">
        <span id="demo-title" className="mr-2 text-[11px] font-bold tracking-[0.16em] text-foreground uppercase md:mb-1 md:block">
          Acesso de avaliação
        </span>
        <span className="hidden md:inline">Contas criadas pelo seed. </span>
        Senha <span className="font-mono">{DEMO_PASSWORD}</span>
      </p>
      <ul className="grid grid-cols-3 gap-2 md:grid-cols-1 md:gap-0">
        {DEMO_ACCOUNTS.map((account) => (
          <li key={account.email} className="md:border-t">
            <button
              type="button"
              onClick={() => onPick(account.email)}
              aria-label={`Preencher com ${account.label} (${account.email})`}
              className="group grid w-full justify-items-center gap-1.5 rounded-lg border border-dashed bg-card px-1 py-2 text-[11.5px] font-semibold transition-colors hover:border-primary md:grid-cols-[32px_minmax(0,1fr)_auto] md:items-center md:justify-items-start md:gap-3 md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-2.5 md:text-left md:text-[13px]"
            >
              <span
                className={cn(
                  'grid size-7 place-items-center rounded-full text-[10.5px] font-bold md:size-8',
                  account.role === Role.AUCTIONEER ? 'bg-primary-soft text-primary' : 'bg-muted text-foreground',
                )}
                aria-hidden="true"
              >
                {account.initials}
              </span>
              <span className="grid min-w-0 leading-tight">
                {account.label}
                <span className="hidden truncate text-xs font-normal text-muted-foreground md:block">{account.email}</span>
              </span>
              <span className="hidden rounded-full border px-3 py-1 text-xs group-hover:border-primary group-hover:text-primary md:block" aria-hidden="true">
                Usar
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

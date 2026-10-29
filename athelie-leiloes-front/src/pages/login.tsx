import { useRef, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { cn } from 'cn';
import { AuthLayout } from '@/components/auth-layout';
import { ErrorAlert, Field } from '@/components/form';
import { Button } from '@/components/ui/button';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ROUTES, Role } from '@/constants';
import { useSubmit } from '@/hooks/use-submit';
import { homeFor, login, useAuth } from '@/lib/auth';

export function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const { submitting, error, fields, submit } = useSubmit();
  const formRef = useRef<HTMLFormElement>(null);

  if (user && !submitting) return <Navigate to={homeFor(user.role, from)} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await submit(async () => {
      const logged = await login({ email: String(form.get('email')), password: String(form.get('password')) });
      navigate(homeFor(logged.role, from), { replace: true });
    });
  }

  // Só preenche: quem avalia vê as credenciais e confirma no botão Entrar.
  function fillDemo(email: string) {
    const form = formRef.current;
    if (!form) return;
    (form.elements.namedItem('email') as HTMLInputElement).value = email;
    (form.elements.namedItem('password') as HTMLInputElement).value = DEMO_PASSWORD;
    form.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus();
  }

  return (
    <AuthLayout
      title="Entrar"
      aside={<DemoAccounts onPick={fillDemo} />}
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link to={ROUTES.REGISTER} state={{ from }} className="font-semibold text-primary underline-offset-4 hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3 md:gap-4" noValidate>
        <Field
          id="email"
          name="email"
          type="email"
          label="E-mail"
          placeholder="voce@exemplo.com"
          autoComplete="email"
          required
          error={fields.email}
        />
        <Field
          id="password"
          name="password"
          type="password"
          label="Senha"
          placeholder="Sua senha"
          autoComplete="current-password"
          required
          error={fields.password}
        />
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <Button type="submit" disabled={submitting} className="mt-1 h-11">
          {submitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </AuthLayout>
  );
}

// Celular: três botões em linha. Desktop: lista com e-mail ao lado do formulário.
function DemoAccounts({ onPick }: { onPick: (email: string) => void }) {
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

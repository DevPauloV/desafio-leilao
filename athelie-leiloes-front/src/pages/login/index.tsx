import { useRef, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { AuthLayout } from '@/components/auth-layout';
import { ErrorAlert } from '@/components/error-alert';
import { Field } from '@/components/field';
import { Button } from '@/components/ui/button';
import { DEMO_PASSWORD, ROUTES } from '@/constants';
import { useSubmit } from '@/hooks/use-submit';
import { homeFor, login, useAuth } from '@/lib/auth';
import { DemoAccounts } from './demo-accounts';

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

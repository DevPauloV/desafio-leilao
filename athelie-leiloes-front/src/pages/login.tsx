import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { AuthCard } from '@/components/auth-card';
import { ErrorAlert, Field } from '@/components/form';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { useSubmit } from '@/hooks/use-submit';
import { homeFor, login, useAuth } from '@/lib/auth';

export function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const { submitting, error, fields, submit } = useSubmit();

  if (user && !submitting) return <Navigate to={homeFor(user.role, from)} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await submit(async () => {
      const logged = await login({ email: String(form.get('email')), password: String(form.get('password')) });
      navigate(homeFor(logged.role, from), { replace: true });
    });
  }

  return (
    <AuthCard
      title="Entrar"
      description="Bem-vindo de volta. Entre para dar seus lances."
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link to={ROUTES.REGISTER} state={{ from }} className="font-semibold text-primary underline-offset-4 hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
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
    </AuthCard>
  );
}

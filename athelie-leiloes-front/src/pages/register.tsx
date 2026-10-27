import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { AuthCard } from '@/components/auth-card';
import { ErrorAlert, Field } from '@/components/form';
import { Button } from '@/components/ui/button';
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH, PASSWORD_MIN_LENGTH, ROLE_LABELS, ROUTES, Role } from '@/constants';
import { ApiError, errorMessage } from '@/lib/api';
import { homeFor, register, useAuth } from '@/lib/auth';

const ROLE_OPTIONS = [
  { value: Role.BIDDER, title: ROLE_LABELS[Role.BIDDER], text: 'Deposita saldo e dá lances nos lotes.' },
  { value: Role.AUCTIONEER, title: ROLE_LABELS[Role.AUCTIONEER], text: 'Cria lotes com obras do The Met. Não dá lances.' },
] as const;

export function RegisterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [role, setRole] = useState<Role>(Role.BIDDER);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (user && !submitting) return <Navigate to={homeFor(user.role, from)} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    setFields({});
    try {
      const created = await register({
        name: String(form.get('name')),
        email: String(form.get('email')),
        password: String(form.get('password')),
        role,
      });
      navigate(homeFor(created.role, from), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError) setFields(err.fields);
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Criar conta"
      description="Leva menos de um minuto."
      footer={
        <>
          Já tem conta?{' '}
          <Link to={ROUTES.LOGIN} state={{ from }} className="font-semibold text-primary underline-offset-4 hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
        <Field
          id="name"
          name="name"
          label="Nome"
          placeholder="Seu nome completo"
          autoComplete="name"
          required
          minLength={NAME_MIN_LENGTH}
          maxLength={NAME_MAX_LENGTH}
          error={fields.name}
        />
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
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          placeholder="Sua senha"
          hint="Pelo menos 8 caracteres."
          error={fields.password}
        />

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-[13px] font-semibold">Como você vai usar</legend>
          {ROLE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-checked:border-primary has-checked:shadow-[0_0_0_1px_var(--primary)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={role === option.value}
                onChange={() => setRole(option.value)}
                className="mt-1 accent-primary focus-visible:outline-none"
              />
              <span className="grid">
                <span className="text-sm font-semibold">{option.title}</span>
                <span className="text-[13px] text-muted-foreground">{option.text}</span>
              </span>
            </label>
          ))}
          {fields.role && <span className="text-[12.5px] text-destructive">{fields.role}</span>}
        </fieldset>

        {error && <ErrorAlert>{error}</ErrorAlert>}
        <Button type="submit" disabled={submitting} className="mt-1 h-11">
          {submitting ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>
    </AuthCard>
  );
}

import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { AuthLayout } from '@/components/auth-layout';
import { ErrorAlert } from '@/components/error-alert';
import { Field } from '@/components/field';
import { Button } from '@/components/ui/button';
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH, PASSWORD_MIN_LENGTH, ROLE_LABELS, ROUTES, Role } from '@/constants';
import { useSubmit } from '@/hooks/use-submit';
import { homeFor, register, useAuth } from '@/lib/auth';
import { Step } from './step';
import { Steps } from './steps';

const ROLE_OPTIONS = [
  {
    value: Role.BIDDER,
    title: 'Quero dar lances',
    summary: 'Deposita saldo, disputa lotes ao vivo e recebe comprovante.',
    points: ['Deposita saldo na carteira', 'Disputa lotes ao vivo', 'Recebe comprovante ao arrematar'],
  },
  {
    value: Role.AUCTIONEER,
    title: 'Quero leiloar',
    summary: 'Monta lotes com obras do The Met. Não dá lances.',
    points: ['Monta lotes com obras do The Met', 'Acompanha lances e resultados', 'Não dá lances'],
  },
] as const;

export function RegisterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [role, setRole] = useState<Role>(Role.BIDDER);
  const [step, setStep] = useState<Step>(Step.ROLE);
  const { submitting, error, fields, submit } = useSubmit();

  if (user && !submitting) return <Navigate to={homeFor(user.role, from)} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Enter na etapa do perfil avança em vez de enviar o formulário vazio.
    if (step === Step.ROLE) return setStep(Step.DATA);
    const form = new FormData(event.currentTarget);
    await submit(async () => {
      const created = await register({
        name: String(form.get('name')),
        email: String(form.get('email')),
        password: String(form.get('password')),
        role,
      });
      navigate(homeFor(created.role, from), { replace: true });
    });
  }

  const onRole = step === Step.ROLE;

  // As duas etapas ficam montadas (a inativa com `hidden`) para não perder o que já foi digitado ao trocar o perfil.
  return (
    <AuthLayout
      title={onRole ? 'Como você quer participar?' : 'Seus dados'}
      description={onRole ? 'O perfil fica fixo na conta e não pode ser trocado depois.' : undefined}
      top={<Steps current={step} />}
      wide={onRole}
      footer={
        onRole && (
          <>
            Já tem conta?{' '}
            <Link to={ROUTES.LOGIN} state={{ from }} className="font-semibold text-primary underline-offset-4 hover:underline">
              Entrar
            </Link>
          </>
        )
      }
    >
      <form onSubmit={handleSubmit} className="grid gap-3 md:gap-4" noValidate>
        <fieldset hidden={!onRole} className="grid gap-2 md:grid-cols-2 md:gap-3.5">
          <legend className="sr-only">Perfil</legend>
          {ROLE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="grid cursor-pointer grid-cols-[18px_minmax(0,1fr)] items-start gap-3 rounded-lg border bg-card p-3 has-checked:border-primary has-checked:shadow-[0_0_0_3px_var(--primary-soft)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring md:p-4.5"
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={role === option.value}
                onChange={() => setRole(option.value)}
                className="mt-1 size-4 accent-primary focus-visible:outline-none"
              />
              <span className="grid gap-1 md:gap-2">
                <span className="text-[11px] font-bold tracking-[0.18em] text-muted-foreground uppercase">{ROLE_LABELS[option.value]}</span>
                <span className="text-base leading-tight font-bold md:text-lg">{option.title}</span>
                <span className="text-[12.5px] text-muted-foreground md:hidden">{option.summary}</span>
                <ul className="hidden list-disc gap-0.5 pl-4 text-[13px] text-muted-foreground md:grid">
                  {option.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </span>
            </label>
          ))}
        </fieldset>

        {onRole ? (
          <Button type="button" onClick={() => setStep(Step.DATA)} className="mt-1 h-11">
            Continuar
          </Button>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg bg-primary-soft px-3 py-2 text-[13px] text-primary">
              <span>Perfil: {ROLE_LABELS[role]}</span>
              <button type="button" onClick={() => setStep(Step.ROLE)} className="font-bold underline-offset-4 hover:underline">
                Trocar
              </button>
            </div>
            {fields.role && <span className="text-[12.5px] text-destructive">{fields.role}</span>}
          </>
        )}

        <div hidden={onRole} className="grid gap-3 md:gap-4">
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
            placeholder="Crie uma senha"
            hint={`Pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`}
            error={fields.password}
          />
          {error && <ErrorAlert>{error}</ErrorAlert>}
          <Button type="submit" disabled={submitting} className="mt-1 h-11">
            {submitting ? 'Criando conta…' : 'Criar conta'}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}

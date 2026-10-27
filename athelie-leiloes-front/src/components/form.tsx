import { useState, type ComponentProps, type ReactNode } from 'react';
import { cn } from 'cn';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Campo com rótulo, dica e erro ligados ao input (aria-describedby / aria-invalid).
 * Campo de senha ganha o botão de mostrar/ocultar.
 */
export function Field({
  id,
  label,
  hint,
  error,
  className,
  type,
  ...input
}: ComponentProps<typeof Input> & { id: string; label: string; hint?: ReactNode; error?: string }) {
  const [revealed, setRevealed] = useState(false);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const isPassword = type === 'password';
  return (
    <div className="grid gap-1">
      <Label htmlFor={id} className="text-[13px] font-semibold">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          className={cn(isPassword && 'pr-11', className)}
          {...input}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={revealed}
            aria-controls={id}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground"
          >
            {revealed ? <EyeOffIcon className="size-4.25" aria-hidden="true" /> : <EyeIcon className="size-4.25" aria-hidden="true" />}
          </button>
        )}
      </div>
      {hint && (
        <span id={hintId} className="text-[12.5px] text-muted-foreground">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="text-[12.5px] text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}

/** Mensagem de erro em destaque (a API já manda o texto pronto). */
export function ErrorAlert({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      role="alert"
      className={cn('rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-sm text-destructive', className)}
    >
      {children}
    </p>
  );
}

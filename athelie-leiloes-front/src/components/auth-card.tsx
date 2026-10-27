import type { ReactNode } from 'react';

/**
 * Cartão das telas de entrar e criar conta, centralizado no espaço abaixo do cabeçalho.
 * A altura mínima desconta o cabeçalho e o respiro do fim da página (maiores a partir de md).
 */
export function AuthCard({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-7.5rem)] items-center justify-center py-8 md:min-h-[calc(100dvh-8.5rem)]">
      <div className="grid w-full max-w-[420px] gap-6 rounded-[10px] border bg-card p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_16px_40px_-20px_rgb(0_0_0/0.18)] sm:p-9">
        <div className="grid gap-1.5">
          <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.025em]">{title}</h1>
          <p className="text-[14.5px] text-muted-foreground">{description}</p>
        </div>
        {children}
        <p className="border-t pt-5 text-center text-sm text-muted-foreground">{footer}</p>
      </div>
    </div>
  );
}

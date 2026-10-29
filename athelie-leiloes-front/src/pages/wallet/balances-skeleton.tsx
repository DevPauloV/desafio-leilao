import { Bone } from '@/components/skeleton';

const SKELETON_ROWS = 3;

/** Mesmo extrato de Balances, com os rótulos reais e blocos no lugar dos valores. */
export function BalancesSkeleton() {
  return (
    <section role="status" aria-label="Carregando a carteira" className="grid grid-cols-1 rounded-[10px] border bg-card p-5 sm:px-7 sm:py-6">
      <div className="border-b pb-3 text-[11.5px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Extrato do saldo</div>
      <div className="flex items-center justify-between gap-3 border-b border-dashed py-3">
        <span className="font-semibold">Saldo total</span>
        <Bone className="h-4 w-28" />
      </div>
      <div className="pt-3 pb-0.5 text-xs font-semibold text-muted-foreground">Comprometido em lotes · seu lance</div>
      {Array.from({ length: SKELETON_ROWS }, (_, row) => (
        <div key={row} className="flex h-14 items-center justify-between gap-3 border-b border-dashed pl-4.5">
          <Bone row={row} className="h-3.5 w-3/5" />
          <Bone row={row} className="h-3.5 w-22" />
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 py-3">
        <span className="font-semibold">Total comprometido</span>
        <Bone className="h-4 w-28" />
      </div>
      <div className="flex flex-col items-start gap-1.5 border-t-[3px] border-double border-foreground pt-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <span className="font-semibold sm:max-w-[16ch]">Disponível para novos lances</span>
        <Bone className="h-9 w-40" />
      </div>
      <Bone className="mt-5 h-2.5 rounded-full" />
      <div className="mt-4 flex flex-wrap gap-4.5">
        <Bone className="h-3 w-38" />
        <Bone className="h-3 w-44" />
      </div>
    </section>
  );
}

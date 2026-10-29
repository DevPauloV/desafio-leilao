import { Bone } from '@/components/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const SKELETON_ROWS = 3;
const AMOUNT_LABELS = ['Saldo total', 'Comprometido', 'Disponível'];

/** Mesmo cartão de Balances, com os rótulos reais e blocos no lugar dos valores. */
export function BalancesSkeleton() {
  return (
    <section role="status" aria-label="Carregando a carteira" className="grid grid-cols-1 gap-5.5 rounded-[10px] border bg-card p-6">
      <dl className="grid gap-4 sm:grid-cols-3">
        {AMOUNT_LABELS.map((label) => (
          <div key={label}>
            <dt className="text-[12.5px] text-muted-foreground">{label}</dt>
            <dd className="flex h-[1.1em] items-center text-[34px]">
              <Bone className="h-[0.8em] w-3/4 rounded-md" />
            </dd>
          </div>
        ))}
      </dl>
      <Bone className="h-2.5 rounded-full" />
      <div className="flex flex-wrap gap-4.5">
        <Bone className="h-3 w-38" />
        <Bone className="h-3 w-44" />
      </div>
      <Table className="min-w-105">
        <TableHeader>
          <TableRow>
            <TableHead className="px-0">Comprometido em</TableHead>
            <TableHead>Seu lance</TableHead>
            <TableHead className="text-right">Termina</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: SKELETON_ROWS }, (_, row) => (
            <TableRow key={row} className="h-11.5">
              <TableCell className="px-0">
                <Bone row={row} className="h-3.5 w-3/5" />
              </TableCell>
              <TableCell>
                <Bone row={row} className="h-3.5 w-22" />
              </TableCell>
              <TableCell>
                <Bone row={row} className="ml-auto h-3.5 w-24" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

import { HowItWorks } from '@/components/how-it-works';
import { PageTitle } from '@/components/page-title';
import { Bone } from '@/components/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const SKELETON_ROWS = 4;
const SKELETON_CELLS = ['w-4', 'w-24', 'w-24', 'w-32', 'w-20', 'w-20', 'w-8'];

/** Mesma página da auditoria: título e explicação reais, blocos no lugar do veredito e dos lances. */
export function AuditSkeleton() {
  return (
    <div role="status" aria-label="Conferindo o histórico" className="grid grid-cols-1 gap-7 pt-7">
      <div className="grid gap-5 sm:flex sm:flex-wrap sm:items-end">
        <Bone className="aspect-4/5 w-20 flex-none justify-self-center rounded-md bg-wall sm:justify-self-auto" />
        <PageTitle title="Auditoria do lote">
          <Bone className="mt-1.5 h-3.5 w-72 max-w-full" />
        </PageTitle>
        <Bone className="h-3 w-36 sm:ml-auto" />
      </div>

      <section className="flex flex-wrap items-center gap-x-5 gap-y-2 border-y py-3.5">
        <Bone className="size-2.5 rounded-full" />
        <Bone className="h-3 w-20" />
        <Bone className="h-3 w-14" />
        <Bone className="h-3 w-52" />
      </section>

      <div className="rounded-[10px] border bg-card">
        <Table className="min-w-180">
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Licitante</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Hash anterior</TableHead>
              <TableHead>Hash</TableHead>
              <TableHead>Confere</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: SKELETON_ROWS }, (_, row) => (
              <TableRow key={row} className="h-11">
                {SKELETON_CELLS.map((width, cell) => (
                  <TableCell key={cell}>
                    <Bone row={row} className={`h-3 ${width}`} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <HowItWorks />
    </div>
  );
}

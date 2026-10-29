import { Link, useParams } from 'react-router';
import { cn } from 'cn';
import { Artwork } from '@/components/artwork';
import { ErrorAlert } from '@/components/error-alert';
import { HowItWorks } from '@/components/how-it-works';
import { LotStatusLabel } from '@/components/lot-status';
import { Paddle } from '@/components/paddle';
import { PageTitle } from '@/components/page-title';
import { ShortHash } from '@/components/short-hash';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AuditProblem, ROUTES, lotPath } from '@/constants';
import { useCrumbLot } from '@/hooks/use-crumb-lot';
import { assetUrl } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { formatDateTimeSeconds } from '@/lib/time';
import { AuditSkeleton } from './audit-skeleton';
import { useAudit } from './use-audit';

const PROBLEM_TEXT: Record<AuditProblem, (seq: number) => string> = {
  [AuditProblem.ALTERED]: (seq) => `Lance #${seq} foi alterado.`,
  [AuditProblem.MISSING]: (seq) => `Lance #${seq} foi removido.`,
  [AuditProblem.INSERTED]: (seq) => `Lance #${seq} foi inserido depois.`,
  [AuditProblem.HEAD_MISMATCH]: () => 'O fim do histórico não confere com o registro do lote.',
};

export function AuditPage() {
  const { id = '' } = useParams();
  const { checking, error, current, myPseudonym, recheck } = useAudit(id);
  useCrumbLot(current?.lot.id, current?.lot.title);

  if (error && !current) {
    return (
      <div className="grid justify-items-start gap-3 pt-7">
        <PageTitle title="Auditoria do lote" />
        <ErrorAlert>{error}</ErrorAlert>
        <Link to={ROUTES.SHOWCASE} className="text-primary underline-offset-4 hover:underline">
          Voltar para a vitrine
        </Link>
      </div>
    );
  }
  if (!current) return <AuditSkeleton />;

  const { lot, bids, verdict } = current;
  const seqInvalid = verdict.firstInvalidSeq ?? 0;
  const problem = verdict.problem && PROBLEM_TEXT[verdict.problem](seqInvalid);

  return (
    <div className="grid grid-cols-1 gap-7 pt-7">
      <div className="grid gap-5 sm:flex sm:flex-wrap sm:items-end">
        <Artwork src={assetUrl(lot.imageUrl)} alt={lot.title} thin className="w-20 flex-none justify-self-center sm:justify-self-auto" />
        <PageTitle title="Auditoria do lote">
          <b className="font-semibold text-foreground">{lot.title}</b>
          {lot.artist && ` · ${lot.artist}`}
        </PageTitle>
        <div className="flex items-center gap-4 sm:ml-auto">
          <LotStatusLabel status={lot.status} />
          <Link to={lotPath(lot.id)} className="text-sm text-primary underline-offset-4 hover:underline">
            Abrir sala
          </Link>
        </div>
      </div>

      <section aria-live="polite" className="grid gap-2 border-y py-3.5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[13px]">
          <span className={cn('size-2.5 rounded-full', verdict.intact ? 'bg-win' : 'bg-destructive')} aria-hidden="true" />
          <b className={cn('font-medium', verdict.intact ? 'text-win' : 'text-destructive')}>
            {verdict.intact ? 'conferida' : 'adulterada'}
          </b>
          <span className="text-muted-foreground">
            {bids.length} {bids.length === 1 ? 'elo' : 'elos'}
          </span>
          <span className="text-muted-foreground">verificado em {formatDateTimeSeconds(current.checkedAt)}</span>
          <button
            type="button"
            disabled={checking}
            onClick={recheck}
            className="text-primary underline underline-offset-4 disabled:opacity-60 sm:ml-auto"
          >
            {checking ? 'verificando…' : 'verificar de novo'}
          </button>
        </div>
        {!verdict.intact && (
          <p className="text-sm text-destructive">
            {problem ?? 'A cadeia de lances não confere.'} Os lances marcados abaixo não conferem com a assinatura.
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>

      {bids.length > 0 && (
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
              {bids.map((bid) => {
                const broken = !bid.valid || (!verdict.intact && bid.seq === verdict.firstInvalidSeq);
                return (
                  <TableRow key={`${bid.seq}:${bid.hash}`} className={broken ? 'bg-destructive-soft' : undefined}>
                    <TableCell className="font-mono">{bid.seq}</TableCell>
                    <TableCell>
                      <Paddle pseudonym={bid.pseudonym} mine={bid.pseudonym === myPseudonym} />
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">{formatMoney(bid.amount)}</TableCell>
                    <TableCell>{formatDateTimeSeconds(bid.createdAt)}</TableCell>
                    <TableCell>
                      <ShortHash hash={bid.prevHash} />
                    </TableCell>
                    <TableCell>
                      <ShortHash hash={bid.hash} />
                    </TableCell>
                    <TableCell className={cn('font-semibold', bid.valid ? 'text-win' : 'text-destructive')}>
                      {bid.valid ? 'Sim' : 'Não'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <HowItWorks />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { cn } from 'cn';
import { Artwork } from '@/components/artwork';
import { ErrorAlert } from '@/components/form';
import { HowItWorks } from '@/components/how-it-works';
import { LotStatusLabel } from '@/components/lot-status';
import { PageTitle } from '@/components/page-title';
import { Bone } from '@/components/skeleton';
import { Paddle } from '@/components/paddle';
import { ShortHash } from '@/components/short-hash';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AuditProblem, ROUTES, Role, lotPath } from '@/constants';
import { api, assetUrl, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCrumbLot } from '@/lib/crumb-lot';
import { formatMoney } from '@/lib/money';
import { formatDateTimeSeconds } from '@/lib/time';
import type { AuditView, LotDetail } from '@/types';

const PROBLEM_TEXT: Record<AuditProblem, (seq: number) => string> = {
  [AuditProblem.ALTERED]: (seq) => `Lance #${seq} foi alterado.`,
  [AuditProblem.MISSING]: (seq) => `Lance #${seq} foi removido.`,
  [AuditProblem.INSERTED]: (seq) => `Lance #${seq} foi inserido depois.`,
  [AuditProblem.HEAD_MISMATCH]: () => 'O fim do histórico não confere com o registro do lote.',
};

export function AuditPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const isBidder = user?.role === Role.BIDDER;
  const [reload, setReload] = useState(0);
  const requestKey = `${id}:${reload}`;
  const [response, setResponse] = useState<{ key: string; audit?: AuditView; error?: string } | null>(null);
  // Guarda a última auditoria para "Verificar de novo" não apagar a tela enquanto confere.
  const [audit, setAudit] = useState<AuditView | null>(null);
  const [myPseudonym, setMyPseudonym] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api<AuditView>(`/api/audit/lots/${encodeURIComponent(id)}`, { signal: controller.signal }).then(
      (data) => {
        setAudit(data);
        setResponse({ key: requestKey, audit: data });
      },
      (err: unknown) => {
        if (!controller.signal.aborted) setResponse({ key: requestKey, error: errorMessage(err) });
      },
    );
    return () => controller.abort();
  }, [id, requestKey]);

  // A auditoria não identifica o usuário: o pseudônimo dele vem do lote (`me`), para marcar "Você".
  useEffect(() => {
    if (!isBidder) return;
    const controller = new AbortController();
    api<LotDetail>(`/api/lots/${encodeURIComponent(id)}`, { signal: controller.signal }).then(
      (lot) => setMyPseudonym(lot.me?.pseudonym ?? null),
      () => {}, // sem o pseudônimo, a tabela só não marca "Você"
    );
    return () => controller.abort();
  }, [id, isBidder]);

  const checking = response?.key !== requestKey;
  const error = response?.key === requestKey ? response.error : undefined;
  const current = audit?.lot.id === id ? audit : null;
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
            onClick={() => setReload((n) => n + 1)}
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

const SKELETON_ROWS = 4;
const SKELETON_CELLS = ['w-4', 'w-24', 'w-24', 'w-32', 'w-20', 'w-20', 'w-8'];

/** Mesma página da auditoria: título e explicação reais, blocos no lugar do veredito e dos lances. */
function AuditSkeleton() {
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

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { cn } from 'cn';
import { Artwork } from '@/components/artwork';
import { ErrorAlert } from '@/components/form';
import { LotStatusLabel } from '@/components/lot-status';
import { PageTitle } from '@/components/page-title';
import { Bone } from '@/components/skeleton';
import { Paddle } from '@/components/paddle';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AuditProblem, ROUTES, Role, lotPath } from '@/constants';
import { api, assetUrl, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatMoney } from '@/lib/money';
import { formatDateTimeSeconds } from '@/lib/time';
import type { AuditView, LotDetail } from '@/types';

const PROBLEM_TEXT: Record<AuditProblem, (seq: number) => string> = {
  [AuditProblem.ALTERED]: (seq) => `Lance #${seq} foi alterado.`,
  [AuditProblem.MISSING]: (seq) => `Lance #${seq} foi removido.`,
  [AuditProblem.INSERTED]: (seq) => `Lance #${seq} foi inserido depois.`,
  [AuditProblem.HEAD_MISMATCH]: () => 'O fim do histórico não confere com o registro do lote.',
};

const HASH_PREVIEW_LENGTH = 4;

function ShortHash({ hash }: { hash: string }) {
  return (
    <span title={hash} className="font-mono text-xs text-muted-foreground">
      {hash.slice(0, HASH_PREVIEW_LENGTH)}…{hash.slice(-HASH_PREVIEW_LENGTH)}
    </span>
  );
}

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

  if (error && !current) {
    return (
      <div className="grid justify-items-start gap-3 pt-7">
        <PageTitle eyebrow="Página pública · sem login" title="Auditoria do lote" />
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
      <div className="flex flex-wrap items-end gap-5">
        <Artwork src={assetUrl(lot.imageUrl)} alt={lot.title} thin className="w-20 flex-none" />
        <PageTitle eyebrow="Página pública · sem login" title="Auditoria do lote">
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

      <section
        aria-live="polite"
        className={cn(
          'grid grid-cols-[auto_minmax(0,1fr)] items-center gap-[18px] rounded-[10px] border p-[22px]',
          verdict.intact
            ? 'border-win/35 bg-win-soft text-win'
            : 'border-destructive/35 bg-destructive-soft text-destructive',
        )}
      >
        <div className="grid size-14 place-items-center rounded-full border-2 border-current" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="size-[26px]">
            {verdict.intact ? (
              <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            )}
          </svg>
        </div>
        <div className="grid gap-1">
          <h2 className="text-[28px] leading-[1.1] font-bold tracking-[-0.025em]">
            {verdict.intact ? 'Histórico íntegro' : 'Histórico adulterado'}
          </h2>
          <p className="text-sm text-foreground">
            {verdict.intact
              ? bids.length === 0
                ? 'O lote ainda não tem lances, e o registro do lote confirma isso.'
                : `${bids.length === 1 ? 'O lance foi conferido' : `Os ${bids.length} lances foram conferidos um a um`}, e a cadeia termina no hash guardado no lote. Nada foi alterado, removido ou inserido.`
              : `${problem ?? 'A cadeia de lances não confere.'} Os lances marcados abaixo não conferem com a assinatura.`}
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>Verificado em {formatDateTimeSeconds(current.checkedAt)}</span>
        <Button type="button" variant="outline" size="sm" disabled={checking} onClick={() => setReload((n) => n + 1)}>
          {checking ? 'Verificando…' : 'Verificar de novo'}
        </Button>
        {error && <span className="text-destructive">{error}</span>}
      </div>

      {bids.length > 0 && (
        <div className="rounded-[10px] border bg-card">
          <Table className="min-w-[720px]">
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

function HowItWorks() {
  return (
    <section className="grid gap-2 rounded-[10px] border bg-card p-5 text-sm">
      <h2 className="font-semibold">Como a verificação funciona</h2>
      <ol className="grid list-decimal gap-1 pl-[18px] text-muted-foreground">
        <li>Cada lance carrega o hash do lance anterior, formando uma corrente.</li>
        <li>Esse hash é assinado com uma chave secreta do servidor, que não fica no banco de dados.</li>
        <li>Se alguém alterar, apagar ou inserir um lance direto no banco, a assinatura deixa de conferir e a corrente quebra naquele ponto.</li>
      </ol>
    </section>
  );
}

const SKELETON_ROWS = 4;
const SKELETON_CELLS = ['w-4', 'w-24', 'w-24', 'w-32', 'w-20', 'w-20', 'w-8'];

/** Mesma página da auditoria: título e explicação reais, blocos no lugar do veredito e dos lances. */
function AuditSkeleton() {
  return (
    <div role="status" aria-label="Conferindo o histórico" className="grid grid-cols-1 gap-7 pt-7">
      <div className="flex flex-wrap items-end gap-5">
        <Bone className="aspect-4/5 w-20 flex-none rounded-md bg-wall" />
        <PageTitle eyebrow="Página pública · sem login" title="Auditoria do lote">
          <Bone className="mt-1.5 h-3.5 w-72 max-w-full" />
        </PageTitle>
        <Bone className="h-3 w-36 sm:ml-auto" />
      </div>

      <section className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-[18px] rounded-[10px] border bg-card p-[22px]">
        <Bone className="size-14 rounded-full" />
        <div className="grid gap-2.5">
          <Bone className="h-6.5 w-64 max-w-full rounded-md" />
          <Bone className="h-3 w-11/12" />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Bone className="h-3 w-52" />
        <Bone className="h-8 w-36 rounded-lg" />
      </div>

      <div className="rounded-[10px] border bg-card">
        <Table className="min-w-[720px]">
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

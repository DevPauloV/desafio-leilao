import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ShieldCheckIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from 'cn';
import { Artwork, MuseumLabel } from '@/components/artwork';
import { EmptyWall, ErrorWall } from '@/components/empty-wall';
import { ErrorAlert, Field } from '@/components/form';
import { LotStatusLabel } from '@/components/lot-status';
import { PageTitle } from '@/components/page-title';
import { Bone } from '@/components/skeleton';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LotStatus, MET_QUERY_MAX_LENGTH, SocketEvent, auditPath, lotPath } from '@/constants';
import { api, assetUrl, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { usePageData } from '@/hooks/use-page-data';
import { useSocketEvent } from '@/hooks/use-socket-event';
import { useSubmit } from '@/hooks/use-submit';
import { formatMoney, parseMoney } from '@/lib/money';
import { MINUTE_MS, toDateTimeLocal } from '@/lib/time';
import type { CreateLotInput, MetArtwork, MyLot, MyLotsResponse } from '@/types';

const DAY_MS = 24 * 60 * MINUTE_MS;
/** Folga para o início sugerido, já que a API recusa início no passado. */
const DEFAULT_START_DELAY_MS = 2 * MINUTE_MS;

const sectionHeading = 'text-[13px] font-semibold tracking-[0.1em] text-muted-foreground uppercase';

export function AuctioneerPanelPage() {
  const { user } = useAuth();
  const { data: mine, error: mineError, reload: reloadMine } = usePageData<MyLotsResponse>('/api/me/lots');
  const [selected, setSelected] = useState<MetArtwork | null>(null);

  // `lot:ended` também chega na sala pessoal do leiloeiro dono: relê para mostrar resultado e total.
  useSocketEvent(SocketEvent.LOT_ENDED, reloadMine);

  const count = (status: LotStatus) => (mine ? String(mine.items.filter((lot) => lot.status === status).length) : null);

  return (
    <div className="grid grid-cols-1 gap-7 pt-7">
      <PageTitle eyebrow={`Leiloeiro · ${user?.name ?? ''}`} title="Painel do leiloeiro" />

      <dl className="flex flex-wrap items-end gap-x-12 gap-y-3">
        <Kpi label="Total recebido" value={mine ? formatMoney(mine.totalReceived, { short: true }) : null} boneClassName="w-36" />
        <Kpi label="Lotes ao vivo" value={count(LotStatus.LIVE)} boneClassName="w-8" />
        <Kpi label="Encerrados" value={count(LotStatus.ENDED)} boneClassName="w-8" />
      </dl>

      <section aria-label="Criar lote" className="grid overflow-hidden rounded-[10px] border bg-card lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <MetSearch selected={selected} onSelect={setSelected} />
        <NewLotForm
          key={selected?.metObjectId ?? 'none'}
          artwork={selected}
          onCreated={() => {
            setSelected(null);
            reloadMine();
          }}
        />
      </section>

      <section aria-labelledby="my-lots-heading" className="grid grid-cols-1 gap-2">
        <h2 id="my-lots-heading" className={sectionHeading}>
          Meus lotes
        </h2>
        {mineError ? (
          <ErrorWall
            title="Seus lotes não carregaram"
            message={mineError}
            onRetry={reloadMine}
          />
        ) : !mine ? (
          <MyLotsSkeleton />
        ) : mine.items.length === 0 ? (
          <EmptyWall title="Você ainda não criou lotes">
            <p className="max-w-[46ch] text-sm text-muted-foreground">
              Busque uma obra do Met logo acima, defina o lance inicial e as datas, e o lote aparece aqui.
            </p>
          </EmptyWall>
        ) : (
          <MyLotsTable lots={mine.items} onChanged={reloadMine} />
        )}
      </section>
    </div>
  );
}

/** `value` nulo = ainda carregando: o bloco ocupa a mesma altura do número. */
function Kpi({ label, value, boneClassName }: { label: string; value: string | null; boneClassName: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex h-9 items-center text-4xl leading-none font-bold tracking-tight tabular-nums">
        {value ?? <Bone className={cn('h-7.5 rounded-md', boneClassName)} />}
      </dd>
    </div>
  );
}

function MetSearch({ selected, onSelect }: { selected: MetArtwork | null; onSelect: (artwork: MetArtwork) => void }) {
  const [results, setResults] = useState<MetArtwork[] | null>(null);
  const [searched, setSearched] = useState('');
  const { submitting: searching, error, submit } = useSubmit();

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get('q')).trim();
    if (!q) return;
    const ok = await submit(async () => {
      const { items } = await api<{ items: MetArtwork[] }>(`/api/met/search?q=${encodeURIComponent(q)}`);
      setResults(items);
      setSearched(q);
    });
    if (!ok) setResults(null);
  }

  return (
    <div className="grid content-start gap-3.5 border-b p-5 lg:border-r lg:border-b-0">
      <form onSubmit={handleSearch} role="search" className="grid gap-1">
        <Label htmlFor="met-q" className="text-[13px] font-semibold">
          Buscar obra no The Met
        </Label>
        <div className="flex gap-2">
          <Input id="met-q" name="q" type="search" maxLength={MET_QUERY_MAX_LENGTH} placeholder="Ex.: cézanne, hokusai, vermeer" aria-describedby="met-q-hint" />
          <Button type="submit" variant="outline" disabled={searching}>
            {searching ? 'Buscando…' : 'Buscar'}
          </Button>
        </div>
        <span id="met-q-hint" className="text-[12.5px] text-muted-foreground">
          Mostra só obras com imagem e em domínio público.
        </span>
      </form>

      <div aria-live="polite" className="grid gap-3">
        {error && <ErrorAlert>{error}</ErrorAlert>}
        {searching && <MetResultsSkeleton />}
        {!searching && results?.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma obra com imagem encontrada para “{searched}”. Tente outro termo.</p>
        )}
        {!searching && results && results.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" aria-label={`Resultados para ${searched}`}>
            {results.map((artwork) => {
              const isSelected = selected?.metObjectId === artwork.metObjectId;
              return (
                <li key={artwork.metObjectId} className="grid">
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelect(artwork)}
                    className="grid content-start gap-1.5 rounded-lg border bg-card p-2 text-left text-[12.5px] aria-pressed:border-primary aria-pressed:shadow-[0_0_0_1px_var(--primary)]"
                  >
                    <Artwork src={artwork.previewUrl} alt="" thin />
                    <b className="leading-[1.3] font-semibold">{artwork.title}</b>
                    <span className="text-muted-foreground">{[artwork.artist, artwork.date].filter(Boolean).join(', ')}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// Uma linha só, em qualquer largura: a grade cresce quando os resultados chegam.
const MET_SKELETON_CARDS = ['grid', 'grid', 'hidden sm:grid', 'hidden xl:grid'];

function MetResultsSkeleton() {
  return (
    <ul role="status" aria-label="Buscando no The Met" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {MET_SKELETON_CARDS.map((display, row) => (
        <li key={row} className={cn(display, 'content-start gap-2 rounded-lg border bg-card p-2')}>
          <Bone row={row} className="aspect-4/5 rounded-md bg-wall" />
          <Bone row={row} className="h-3 w-4/5" />
          <Bone row={row} className="h-2.5 w-3/5" />
        </li>
      ))}
    </ul>
  );
}

type FormFields = Partial<Record<keyof CreateLotInput, string>>;

function NewLotForm({ artwork, onCreated }: { artwork: MetArtwork | null; onCreated: () => void }) {
  const [startDefault] = useState(() => {
    const start = Math.ceil((Date.now() + DEFAULT_START_DELAY_MS) / MINUTE_MS) * MINUTE_MS;
    return { start: toDateTimeLocal(start), end: toDateTimeLocal(start + DAY_MS) };
  });
  const { submitting, error, setError, fields, setFields, submit } = useSubmit();

  if (!artwork) {
    return (
      <div className="grid content-start gap-2 bg-muted p-5">
        <span className="text-[11.5px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Novo lote</span>
        <p className="text-sm text-muted-foreground">Escolha uma obra na busca para montar o lote.</p>
      </div>
    );
  }
  const chosen = artwork;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const startingBid = parseMoney(String(form.get('startingBid')));
    const minIncrement = parseMoney(String(form.get('minIncrement')));
    const startsAt = String(form.get('startsAt'));
    const endsAt = String(form.get('endsAt'));

    const local: FormFields = {};
    if (!startingBid) local.startingBid = 'Informe um valor maior que zero, ex.: 20.000,00.';
    if (!minIncrement) local.minIncrement = 'Informe um valor maior que zero, ex.: 1.000,00.';
    if (!startsAt) local.startsAt = 'Informe a data e a hora do início.';
    if (!endsAt) local.endsAt = 'Informe a data e a hora do fim.';
    setFields(local);
    setError(null);
    if (!startingBid || !minIncrement || !startsAt || !endsAt) return;

    const input: CreateLotInput = {
      metObjectId: chosen.metObjectId,
      startingBid,
      minIncrement,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
    };
    const ok = await submit(() => api('/api/lots', { method: 'POST', body: input }));
    if (!ok) return;
    toast.success('Lote publicado', { description: chosen.title });
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid content-start gap-3.5 bg-muted p-5">
      <div className="grid gap-px">
        <span className="text-[11.5px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Novo lote</span>
        <MuseumLabel
          artist={chosen.artist}
          title={chosen.title}
          meta={[chosen.date, chosen.medium].filter(Boolean).join(' · ')}
        />
      </div>
      {fields.metObjectId && <ErrorAlert>{fields.metObjectId}</ErrorAlert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="f-start" name="startingBid" label="Lance inicial" autoFocus inputMode="decimal" placeholder="20.000,00" className="font-mono text-base" error={fields.startingBid} />
        <Field id="f-inc" name="minIncrement" label="Incremento mínimo" inputMode="decimal" placeholder="1.000,00" className="font-mono text-base" error={fields.minIncrement} />
        <Field id="f-begin" name="startsAt" type="datetime-local" label="Início" defaultValue={startDefault.start} error={fields.startsAt} />
        <Field id="f-end" name="endsAt" type="datetime-local" label="Fim" defaultValue={startDefault.end} error={fields.endsAt} />
      </div>
      {error && <ErrorAlert>{error}</ErrorAlert>}
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Publicando…' : 'Publicar lote'}
      </Button>
    </form>
  );
}

function MyLotsTable({ lots, onChanged }: { lots: MyLot[]; onChanged: () => void }) {
  const [confirming, setConfirming] = useState<MyLot | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Fecha o modal também no erro (ex.: o lote encerrou enquanto ele estava aberto); o toast explica e a lista é relida.
  async function cancel(lot: MyLot) {
    setCancelling(true);
    try {
      const { refunded } = await api<{ refunded: boolean }>(`/api/lots/${lot.id}/cancel`, { method: 'POST' });
      toast.success(refunded ? 'Lote cancelado e lance estornado' : 'Lote cancelado', { description: lot.title });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCancelling(false);
      setConfirming(null);
      onChanged();
    }
  }

  return (
    <div className="rounded-[10px] border bg-card">
      <Table className="min-w-160 text-sm">
        <MyLotsHeader />
        <TableBody>
          {lots.map((lot) => {
            const open = lot.status === LotStatus.LIVE || lot.status === LotStatus.SCHEDULED;
            const canCancel = open;
            const refund = lot.bidCount > 0 && lot.currentBid !== null;
            return (
              <TableRow key={lot.id}>
                <TableCell className="whitespace-normal">
                  <div className="flex items-center gap-3">
                    <Artwork src={assetUrl(lot.imageUrl)} alt="" thin className="w-11 flex-none" />
                    <MuseumLabel
                      title={
                        <Link to={lotPath(lot.id)} className="underline-offset-4 hover:text-primary hover:underline">
                          {lot.title}
                        </Link>
                      }
                      meta={lot.artist}
                      titleClassName="text-base"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <LotStatusLabel status={lot.status} />
                </TableCell>
                <TableCell className="tabular-nums">{lot.bidCount}</TableCell>
                <TableCell className="tabular-nums">
                  <LotResult lot={lot} />
                </TableCell>
                <TableCell className="whitespace-normal">
                  <div className="flex items-center justify-end gap-2">
                    {canCancel && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirming(lot)}
                        aria-label={`${refund ? 'Cancelar e estornar' : 'Cancelar'} o lote ${lot.title}`}
                      >
                        {refund ? 'Cancelar e estornar' : 'Cancelar'}
                      </Button>
                    )}
                    <Button asChild size="icon" variant="outline" className="text-muted-foreground hover:text-primary">
                      <Link to={auditPath(lot.id)} aria-label={`Auditoria do lote ${lot.title}`} title="Auditoria do lote">
                        <ShieldCheckIcon />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <CancelLotDialog lot={confirming} cancelling={cancelling} onConfirm={cancel} onClose={() => setConfirming(null)} />
    </div>
  );
}

function CancelLotDialog({
  lot,
  cancelling,
  onConfirm,
  onClose,
}: {
  lot: MyLot | null;
  cancelling: boolean;
  onConfirm: (lot: MyLot) => void;
  onClose: () => void;
}) {
  const refund = lot !== null && lot.bidCount > 0 && lot.currentBid !== null;
  return (
    <AlertDialog open={lot !== null} onOpenChange={(open) => !open && !cancelling && onClose()}>
      <AlertDialogContent className="gap-4.5 p-5.5 sm:max-w-md">
        <div className="grid gap-1">
          <span className="text-[11px] font-bold tracking-[0.16em] text-primary uppercase">Cancelamento</span>
          <AlertDialogTitle className="text-xl font-extrabold tracking-[-0.02em]">
            {refund ? 'Cancelar e estornar o lote?' : 'Cancelar o lote?'}
          </AlertDialogTitle>
        </div>
        {lot && (
          <div className="flex items-center gap-3.5 rounded-[10px] bg-background p-3">
            <Artwork src={assetUrl(lot.imageUrl)} alt="" thin className="w-16 flex-none" />
            <div className="grid min-w-0 gap-1">
              <MuseumLabel artist={lot.artist} title={lot.title} titleClassName="text-[17px]" compact />
              <span className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                <LotStatusLabel status={lot.status} />·
                <span>{lot.bidCount === 0 ? 'Sem lances' : `${lot.bidCount} ${lot.bidCount === 1 ? 'lance' : 'lances'}`}</span>
              </span>
            </div>
          </div>
        )}
        <AlertDialogDescription asChild>
          <ul className="grid gap-2 text-sm text-pretty text-muted-foreground">
            <CancelConsequence>O lote sai da vitrine e não recebe mais lances.</CancelConsequence>
            {refund && (
              <CancelConsequence money>
                O lance de <b className="font-semibold text-foreground">{formatMoney(lot.currentBid ?? 0)}</b> volta na hora para o
                saldo disponível do líder.
              </CancelConsequence>
            )}
            <CancelConsequence>Essa ação não pode ser desfeita.</CancelConsequence>
          </ul>
        </AlertDialogDescription>
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <AlertDialogCancel disabled={cancelling}>Manter lote</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={cancelling}
            onClick={() => lot && onConfirm(lot)}
            className="bg-destructive text-primary-foreground hover:bg-destructive/90"
          >
            {cancelling ? 'Cancelando…' : refund ? 'Sim, cancelar e estornar' : 'Sim, cancelar'}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** `money`: marca em bordô o item do estorno, o que mexe com o saldo de alguém. */
function CancelConsequence({ money = false, children }: { money?: boolean; children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span aria-hidden="true" className={cn('mt-2 size-1.5 flex-none rounded-full', money ? 'bg-primary' : 'bg-border')} />
      <span>{children}</span>
    </li>
  );
}

function MyLotsHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Lote</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Lances</TableHead>
        <TableHead>Resultado</TableHead>
        <TableHead>
          <span className="sr-only">Ações</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}

const SKELETON_ROWS = 3;

/** Mesma tabela de MyLotsTable, com blocos no lugar de cada célula. */
function MyLotsSkeleton() {
  return (
    <div role="status" aria-label="Carregando seus lotes" className="rounded-[10px] border bg-card">
      <Table className="min-w-160 text-sm">
        <MyLotsHeader />
        <TableBody>
          {Array.from({ length: SKELETON_ROWS }, (_, row) => (
            <TableRow key={row}>
              {/* Na tabela real, os títulos alargam esta coluna; sem a largura, as outras pulariam para a direita. */}
              <TableCell className="w-1/2">
                <div className="flex items-center gap-3">
                  <Bone row={row} className="aspect-4/5 w-11 flex-none rounded-md bg-wall" />
                  <div className="grid flex-1 gap-2">
                    <Bone row={row} className="h-3.5 w-3/5" />
                    <Bone row={row} className="h-3 w-2/5" />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Bone row={row} className="h-3 w-18" />
              </TableCell>
              <TableCell>
                <Bone row={row} className="h-3 w-4" />
              </TableCell>
              <TableCell>
                <Bone row={row} className="h-3 w-30" />
              </TableCell>
              <TableCell>
                <Bone row={row} className="ml-auto h-8 w-24 rounded-md" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LotResult({ lot }: { lot: MyLot }) {
  if (lot.status === LotStatus.ENDED) {
    if (!lot.result) return <span className="text-muted-foreground">Apurando resultado…</span>;
    if (lot.result.sold && lot.result.amount !== null) {
      return <Badge variant="accent">Arrematado por {formatMoney(lot.result.amount, { short: true })}</Badge>;
    }
    return <Badge variant="neutral">Sem lances</Badge>;
  }
  if (lot.status !== LotStatus.CANCELLED && lot.currentBid !== null) {
    return <>Lance atual {formatMoney(lot.currentBid, { short: true })}</>;
  }
  return <span className="text-muted-foreground">—</span>;
}

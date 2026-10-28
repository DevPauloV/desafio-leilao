import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Artwork, MuseumLabel } from '@/components/artwork';
import { EmptyWall, ErrorWall } from '@/components/empty-wall';
import { ErrorAlert, Field } from '@/components/form';
import { LotStatusLabel } from '@/components/lot-status';
import { PageTitle } from '@/components/page-title';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LotStatus, MET_QUERY_MAX_LENGTH, SocketEvent } from '@/constants';
import { ApiError, api, assetUrl, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { usePageData } from '@/lib/loading';
import { socket } from '@/lib/socket';
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
  useEffect(() => {
    socket.on(SocketEvent.LOT_ENDED, reloadMine);
    return () => {
      socket.off(SocketEvent.LOT_ENDED, reloadMine);
    };
  }, [reloadMine]);

  const count = (status: LotStatus) => (mine ? String(mine.items.filter((lot) => lot.status === status).length) : '—');

  return (
    <div className="grid grid-cols-1 gap-7 pt-7">
      <PageTitle eyebrow={`Leiloeiro · ${user?.name ?? ''}`} title="Painel do leiloeiro" />

      <dl className="flex flex-wrap items-end gap-x-12 gap-y-3">
        <Kpi label="Total recebido" value={mine ? formatMoney(mine.totalReceived, { short: true }) : '—'} />
        <Kpi label="Lotes ao vivo" value={count(LotStatus.LIVE)} />
        <Kpi label="Encerrados" value={count(LotStatus.ENDED)} />
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
          <p role="status" className="rounded-[10px] border bg-card p-6 text-muted-foreground">
            Carregando seus lotes…
          </p>
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

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-4xl leading-none font-bold tracking-tight tabular-nums">{value}</dd>
    </div>
  );
}

function MetSearch({ selected, onSelect }: { selected: MetArtwork | null; onSelect: (artwork: MetArtwork) => void }) {
  const [results, setResults] = useState<MetArtwork[] | null>(null);
  const [searched, setSearched] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get('q')).trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    try {
      const { items } = await api<{ items: MetArtwork[] }>(`/api/met/search?q=${encodeURIComponent(q)}`);
      setResults(items);
      setSearched(q);
    } catch (err) {
      setResults(null);
      setError(errorMessage(err));
    } finally {
      setSearching(false);
    }
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
        {searching && <p className="text-sm text-muted-foreground">Buscando no The Met…</p>}
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

type FormFields = Partial<Record<keyof CreateLotInput, string>>;

function NewLotForm({ artwork, onCreated }: { artwork: MetArtwork | null; onCreated: () => void }) {
  const [startDefault] = useState(() => {
    const start = Math.ceil((Date.now() + DEFAULT_START_DELAY_MS) / MINUTE_MS) * MINUTE_MS;
    return { start: toDateTimeLocal(start), end: toDateTimeLocal(start + DAY_MS) };
  });
  const [fields, setFields] = useState<FormFields>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

    setSubmitting(true);
    try {
      const input: CreateLotInput = {
        metObjectId: chosen.metObjectId,
        startingBid,
        minIncrement,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      };
      await api('/api/lots', { method: 'POST', body: input });
      toast.success('Lote publicado', { description: chosen.title });
      onCreated();
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError) setFields(err.fields);
      setSubmitting(false);
    }
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
  const [confirming, setConfirming] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  async function cancel(lot: MyLot) {
    setCancelling(lot.id);
    try {
      const { refunded } = await api<{ refunded: boolean }>(`/api/lots/${lot.id}/cancel`, { method: 'POST' });
      toast.success(refunded ? 'Lote cancelado e lance estornado' : 'Lote cancelado', { description: lot.title });
      setConfirming(null);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
      onChanged();
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div className="rounded-[10px] border bg-card">
      <Table className="min-w-160 text-sm">
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
                    <MuseumLabel title={lot.title} meta={lot.artist} titleClassName="text-base" />
                  </div>
                </TableCell>
                <TableCell>
                  <LotStatusLabel status={lot.status} />
                </TableCell>
                <TableCell className="tabular-nums">{lot.bidCount}</TableCell>
                <TableCell className="tabular-nums">
                  <LotResult lot={lot} />
                </TableCell>
                <TableCell className="text-right whitespace-normal">
                  {canCancel &&
                    (confirming === lot.id ? (
                      <span className="ml-auto inline-flex max-w-75 flex-wrap items-center justify-end gap-2">
                        <span className="text-[13px]">
                          {refund
                            ? `Cancelar este lote? O lance de ${formatMoney(lot.currentBid ?? 0)} volta para o saldo disponível do líder.`
                            : 'Cancelar este lote?'}
                        </span>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          autoFocus
                          disabled={cancelling === lot.id}
                          onClick={() => void cancel(lot)}
                        >
                          {cancelling === lot.id ? 'Cancelando…' : 'Sim, cancelar'}
                        </Button>
                        <Button type="button" variant="outline" size="sm" disabled={cancelling === lot.id} onClick={() => setConfirming(null)}>
                          Não
                        </Button>
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirming(lot.id)}
                        aria-label={`${refund ? 'Cancelar e estornar' : 'Cancelar'} o lote ${lot.title}`}
                      >
                        {refund ? 'Cancelar e estornar' : 'Cancelar'}
                      </Button>
                    ))}
                </TableCell>
              </TableRow>
            );
          })}
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

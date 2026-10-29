import { useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { cn } from 'cn';
import { Artwork, MuseumLabel } from '@/components/artwork';
import { ErrorAlert, Field } from '@/components/form';
import { Button } from '@/components/ui/button';
import { ANTI_SNIPING_WINDOW_MS, LotStatus } from '@/constants';
import { api } from '@/lib/api';
import { useServerNow } from '@/hooks/use-server-now';
import { useSubmit } from '@/hooks/use-submit';
import { parseMoney } from '@/lib/money';
import { MINUTE_MS, formatShortDate, toDateTimeLocal } from '@/lib/time';
import { LotCard } from '@/pages/showcase/lot-card';
import type { CreateLotInput, LotSummary, MetArtwork } from '@/types';

const DAY_MS = 24 * 60 * MINUTE_MS;

/** Atalhos de duração; acima de 7 dias, "Personalizado" libera a data do fim. */
const DURATIONS = [
  { label: '24 h', ms: DAY_MS },
  { label: '3 dias', ms: 3 * DAY_MS },
  { label: '7 dias', ms: 7 * DAY_MS },
] as const;

/** Folga para o início sugerido, já que a API recusa início no passado. */
const DEFAULT_START_DELAY_MS = 2 * MINUTE_MS;

const PREVIEW_ID = 'preview';

const ANTI_SNIPING_MINUTES = ANTI_SNIPING_WINDOW_MS / MINUTE_MS;

type FormFields = Partial<Record<keyof CreateLotInput, string>>;

type Schedule = { startNow: boolean; startsAt: string; durationMs: number | null; endsAt: string };

/** Início e fim em ms; NaN quando o campo da data está vazio. */
function lotWindow(schedule: Schedule, now: number): { start: number; end: number } {
  const start = schedule.startNow ? now : new Date(schedule.startsAt).getTime();
  const end = schedule.durationMs === null ? new Date(schedule.endsAt).getTime() : start + schedule.durationMs;
  return { start, end };
}

export function NewLotForm({ artwork, serverOffset, onCreated }: { artwork: MetArtwork; serverOffset: number; onCreated: () => void }) {
  const [schedule, setSchedule] = useState<Schedule>(() => {
    const start = Math.ceil((Date.now() + DEFAULT_START_DELAY_MS) / MINUTE_MS) * MINUTE_MS;
    return { startNow: false, startsAt: toDateTimeLocal(start), durationMs: DAY_MS, endsAt: toDateTimeLocal(start + DAY_MS) };
  });
  const [startingBid, setStartingBid] = useState('');
  const { submitting, error, setError, fields, setFields, submit } = useSubmit();
  const update = (next: Partial<Schedule>) => setSchedule((current) => ({ ...current, ...next }));

  const now = useServerNow(serverOffset);
  const { start, end } = lotWindow(schedule, now);
  const endValid = Number.isFinite(start) && Number.isFinite(end) && end > start;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const bid = parseMoney(startingBid);
    const minIncrement = parseMoney(String(form.get('minIncrement')));
    const times = lotWindow(schedule, Date.now() + serverOffset);

    const local: FormFields = {};
    if (!bid) local.startingBid = 'Informe um valor maior que zero, ex.: 20.000,00.';
    if (!minIncrement) local.minIncrement = 'Informe um valor maior que zero, ex.: 1.000,00.';
    if (!Number.isFinite(times.start)) local.startsAt = 'Informe a data e a hora do início.';
    if (!Number.isFinite(times.end)) local.endsAt = 'Informe a data e a hora do fim.';
    else if (times.end <= times.start) local.endsAt = 'O fim precisa ser depois do início.';
    setFields(local);
    setError(null);
    if (!bid || !minIncrement || Object.keys(local).length > 0) return;

    const input: CreateLotInput = {
      metObjectId: artwork.metObjectId,
      startingBid: bid,
      minIncrement,
      startsAt: new Date(times.start).toISOString(),
      endsAt: new Date(times.end).toISOString(),
    };
    const ok = await submit(() => api('/api/lots', { method: 'POST', body: input }));
    if (!ok) return;
    toast.success('Lote publicado', { description: artwork.title });
    onCreated();
  }

  return (
    <div className="grid gap-4">
      {/* A prévia só no desktop; no celular a obra aparece pequena no topo do formulário. */}
      <section aria-label="Prévia na vitrine" className="hidden gap-3 rounded-[10px] border bg-card p-5 lg:grid">
        <span className="text-[11.5px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Como vai aparecer na vitrine</span>
        <Preview artwork={artwork} startingBid={parseMoney(startingBid) ?? 0} schedule={schedule} now={now} />
      </section>

      <form onSubmit={handleSubmit} noValidate className="grid gap-4 rounded-[10px] border bg-card p-5">
        <div className="flex items-center gap-3.5">
          <Artwork src={artwork.previewUrl} alt="" thin className="w-16 flex-none lg:hidden" />
          <MuseumLabel artist={artwork.artist} title={artwork.title} meta={[artwork.date, artwork.medium].filter(Boolean).join(' · ')} />
        </div>
        {fields.metObjectId && <ErrorAlert>{fields.metObjectId}</ErrorAlert>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            id="f-start"
            name="startingBid"
            label="Lance inicial"
            autoFocus
            inputMode="decimal"
            placeholder="20.000,00"
            value={startingBid}
            onChange={(event) => setStartingBid(event.target.value)}
            className="font-mono text-base"
            error={fields.startingBid}
          />
          <Field id="f-inc" name="minIncrement" label="Incremento mínimo" inputMode="decimal" placeholder="1.000,00" className="font-mono text-base" error={fields.minIncrement} />
        </div>

        <Choices label="Início">
          <Choice on={schedule.startNow} onClick={() => update({ startNow: true })}>
            Agora
          </Choice>
          <Choice on={!schedule.startNow} onClick={() => update({ startNow: false })}>
            Agendar
          </Choice>
        </Choices>
        {!schedule.startNow && (
          <Field
            id="f-begin"
            type="datetime-local"
            label="Abre em"
            value={schedule.startsAt}
            onChange={(event) => update({ startsAt: event.target.value })}
            error={fields.startsAt}
          />
        )}

        <Choices label="Duração">
          {DURATIONS.map((duration) => (
            <Choice key={duration.ms} on={schedule.durationMs === duration.ms} onClick={() => update({ durationMs: duration.ms })}>
              {duration.label}
            </Choice>
          ))}
          <Choice on={schedule.durationMs === null} onClick={() => update({ durationMs: null })}>
            Personalizado
          </Choice>
        </Choices>
        {schedule.durationMs === null && (
          <Field
            id="f-end"
            type="datetime-local"
            label="Termina em"
            value={schedule.endsAt}
            onChange={(event) => update({ endsAt: event.target.value })}
            error={fields.endsAt}
          />
        )}
        {schedule.durationMs !== null && fields.endsAt && <ErrorAlert>{fields.endsAt}</ErrorAlert>}

        <p className="rounded-md bg-muted px-3 py-2.5 text-[13px] text-muted-foreground">
          {endValid ? (
            <>
              Termina <b className="font-semibold text-foreground">{formatShortDate(new Date(end).toISOString())}</b>.{' '}
            </>
          ) : null}
          Lance nos {ANTI_SNIPING_MINUTES} últimos minutos prorroga o fim.
        </p>

        {error && <ErrorAlert>{error}</ErrorAlert>}
        <Button type="submit" disabled={submitting} className="h-11">
          {submitting ? 'Publicando…' : 'Publicar lote'}
        </Button>
      </form>
    </div>
  );
}

/** O mesmo card da vitrine, com os valores digitados; `inert` porque ainda não existe lote para abrir. */
function Preview({
  artwork,
  startingBid,
  schedule,
  now,
}: {
  artwork: MetArtwork;
  startingBid: number;
  schedule: Schedule;
  now: number;
}) {
  const { start, end } = lotWindow(schedule, now);
  const valid = Number.isFinite(start) && Number.isFinite(end);
  const lot: LotSummary = {
    id: PREVIEW_ID,
    title: artwork.title,
    artist: artwork.artist,
    date: artwork.date,
    medium: artwork.medium,
    department: artwork.department,
    imageUrl: artwork.previewUrl,
    status: schedule.startNow ? LotStatus.LIVE : LotStatus.SCHEDULED,
    startsAt: new Date(valid ? start : now).toISOString(),
    endsAt: new Date(valid ? end : now).toISOString(),
    startingBid,
    currentBid: null,
    bidCount: 0,
  };
  return (
    <div inert className="mx-auto w-full max-w-64 select-none">
      <LotCard lot={lot} now={now} />
    </div>
  );
}

function Choices({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="grid gap-1.5">
      <span className="text-[13px] font-semibold">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'h-9 rounded-md border bg-card px-3.5 text-[13px] font-semibold transition-colors hover:border-primary/60',
        on && 'border-primary bg-primary-soft text-primary',
      )}
    >
      {children}
    </button>
  );
}


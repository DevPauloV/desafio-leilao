import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Artwork } from '@/components/artwork';
import { ErrorAlert } from '@/components/error-alert';
import { Field } from '@/components/field';
import { MuseumLabel } from '@/components/museum-label';
import { Button } from '@/components/ui/button';
import { ANTI_SNIPING_WINDOW_MS } from '@/constants';
import { api } from '@/lib/api';
import { useServerNow } from '@/hooks/use-server-now';
import { useSubmit } from '@/hooks/use-submit';
import { parseMoney } from '@/lib/money';
import { MINUTE_MS, formatShortDate, toDateTimeLocal } from '@/lib/time';
import type { CreateLotInput, MetArtwork } from '@/types';
import { Choice } from './choice';
import { Choices } from './choices';
import { lotWindow, type Schedule } from './lot-window';
import { Preview } from './preview';

const DAY_MS = 24 * 60 * MINUTE_MS;

/** Atalhos de duração; acima de 7 dias, "Personalizado" libera a data do fim. */
const DURATIONS = [
  { label: '24 h', ms: DAY_MS },
  { label: '3 dias', ms: 3 * DAY_MS },
  { label: '7 dias', ms: 7 * DAY_MS },
] as const;

/** Folga para o início sugerido, já que a API recusa início no passado. */
const DEFAULT_START_DELAY_MS = 2 * MINUTE_MS;

const ANTI_SNIPING_MINUTES = ANTI_SNIPING_WINDOW_MS / MINUTE_MS;

const INCREMENT_TOO_HIGH = 'O incremento mínimo não pode ser maior que o lance inicial.';

type FormFields = Partial<Record<keyof CreateLotInput, string>>;

export function NewLotForm({ artwork, serverOffset, onCreated }: { artwork: MetArtwork; serverOffset: number; onCreated: () => void }) {
  const [schedule, setSchedule] = useState<Schedule>(() => {
    const start = Math.ceil((Date.now() + DEFAULT_START_DELAY_MS) / MINUTE_MS) * MINUTE_MS;
    return { startNow: false, startsAt: toDateTimeLocal(start), durationMs: DAY_MS, endsAt: toDateTimeLocal(start + DAY_MS) };
  });
  const [startingBid, setStartingBid] = useState('');
  const [minIncrement, setMinIncrement] = useState('');
  const { submitting, error, setError, fields, setFields, submit } = useSubmit();
  const bidCents = parseMoney(startingBid);
  const incrementCents = parseMoney(minIncrement);
  const incrementTooHigh = !!bidCents && !!incrementCents && incrementCents > bidCents;
  const update = (next: Partial<Schedule>) => setSchedule((current) => ({ ...current, ...next }));

  const now = useServerNow(serverOffset);
  const { start, end } = lotWindow(schedule, now);
  const endValid = Number.isFinite(start) && Number.isFinite(end) && end > start;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const bid = bidCents;
    const increment = incrementCents;
    const times = lotWindow(schedule, Date.now() + serverOffset);

    const local: FormFields = {};
    if (!bid) local.startingBid = 'Informe um valor maior que zero, ex.: 20.000,00.';
    if (!increment) local.minIncrement = 'Informe um valor maior que zero, ex.: 1.000,00.';
    else if (incrementTooHigh) local.minIncrement = INCREMENT_TOO_HIGH;
    if (!Number.isFinite(times.start)) local.startsAt = 'Informe a data e a hora do início.';
    if (!Number.isFinite(times.end)) local.endsAt = 'Informe a data e a hora do fim.';
    else if (times.end <= times.start) local.endsAt = 'O fim precisa ser depois do início.';
    setFields(local);
    setError(null);
    if (!bid || !increment || Object.keys(local).length > 0) return;

    const input: CreateLotInput = {
      metObjectId: artwork.metObjectId,
      startingBid: bid,
      minIncrement: increment,
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
        <Preview artwork={artwork} startingBid={bidCents ?? 0} schedule={schedule} now={now} />
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
          <Field
            id="f-inc"
            name="minIncrement"
            label="Incremento mínimo"
            inputMode="decimal"
            placeholder="1.000,00"
            value={minIncrement}
            onChange={(event) => setMinIncrement(event.target.value)}
            className="font-mono text-base"
            error={incrementTooHigh ? INCREMENT_TOO_HIGH : fields.minIncrement}
          />
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

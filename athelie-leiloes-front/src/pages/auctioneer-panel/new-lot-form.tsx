import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { MuseumLabel } from '@/components/artwork';
import { ErrorAlert, Field } from '@/components/form';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useSubmit } from '@/hooks/use-submit';
import { parseMoney } from '@/lib/money';
import { MINUTE_MS, toDateTimeLocal } from '@/lib/time';
import type { CreateLotInput, MetArtwork } from '@/types';

const DAY_MS = 24 * 60 * MINUTE_MS;

/** Folga para o início sugerido, já que a API recusa início no passado. */
const DEFAULT_START_DELAY_MS = 2 * MINUTE_MS;

type FormFields = Partial<Record<keyof CreateLotInput, string>>;

export function NewLotForm({ artwork, onCreated }: { artwork: MetArtwork | null; onCreated: () => void }) {
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

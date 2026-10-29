import { useState, type FormEvent } from 'react';
import { Artwork } from '@/components/artwork';
import { ErrorAlert } from '@/components/error-alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MET_QUERY_MAX_LENGTH } from '@/constants';
import { api } from '@/lib/api';
import { useSubmit } from '@/hooks/use-submit';
import type { MetArtwork } from '@/types';
import { MetResultsSkeleton } from './met-results-skeleton';

export function MetSearch({ selected, onSelect }: { selected: MetArtwork | null; onSelect: (artwork: MetArtwork) => void }) {
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
    <div className="grid content-start gap-3.5 rounded-[10px] border bg-card p-5">
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

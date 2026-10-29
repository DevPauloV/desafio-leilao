import { useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { LOCALE } from '@/constants';
import type { Facet } from '@/types';
import { FacetIndex } from './facet-index';

const ARTIST_PREVIEW = 6;

export function ArtistFilter({ artists, value, onSelect }: { artists: Facet[]; value: string; onSelect: (name: string) => void }) {
  const [term, setTerm] = useState('');
  const [expanded, setExpanded] = useState(false);
  const needle = term.trim().toLocaleLowerCase(LOCALE);
  const matches = needle ? artists.filter((artist) => artist.name.toLocaleLowerCase(LOCALE).includes(needle)) : artists;
  const shown = expanded || needle ? matches : matches.slice(0, ARTIST_PREVIEW);
  // O artista escolhido continua visível mesmo fora da prévia ou da aba atual.
  const selected = value && !shown.some((artist) => artist.name === value) ? [{ name: value, count: 0 }] : [];

  return (
    <div className="grid gap-2">
      {artists.length > ARTIST_PREVIEW && (
        <label className="flex h-9 items-center gap-2 rounded-lg border border-input bg-card px-2.5 text-muted-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <SearchIcon className="size-3.5 shrink-0" aria-hidden="true" />
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Buscar artista"
            aria-label="Buscar artista"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-none"
          />
        </label>
      )}
      {needle && matches.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Nenhum artista com “{term.trim()}”.</p>
      ) : (
        <FacetIndex allLabel="Todos" items={[...selected, ...shown]} value={value} onSelect={onSelect} />
      )}
      {!needle && artists.length > ARTIST_PREVIEW && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="justify-self-start text-[12.5px] text-muted-foreground underline underline-offset-3 hover:text-foreground"
        >
          {expanded ? 'Mostrar menos' : `Ver todos os ${artists.length}`}
        </button>
      )}
    </div>
  );
}

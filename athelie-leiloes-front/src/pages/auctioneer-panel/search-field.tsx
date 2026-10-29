import { SearchIcon } from 'lucide-react';

export function SearchField({ query, onQuery }: { query: string; onQuery: (query: string) => void }) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-lg border border-input bg-card px-3 text-muted-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <SearchIcon className="size-4 shrink-0" aria-hidden="true" />
      <input
        type="search"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        placeholder="Buscar por obra ou artista"
        aria-label="Buscar nos meus lotes"
        className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-none"
      />
    </label>
  );
}

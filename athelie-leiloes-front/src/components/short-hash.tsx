const HASH_PREVIEW_LENGTH = 4;

export function ShortHash({ hash }: { hash: string }) {
  return (
    <span title={hash} className="font-mono text-xs text-muted-foreground">
      {hash.slice(0, HASH_PREVIEW_LENGTH)}…{hash.slice(-HASH_PREVIEW_LENGTH)}
    </span>
  );
}

import { useState, type ReactNode } from 'react';
import { cn } from 'cn';

export function Artwork({
  src,
  alt,
  thin = false,
  className,
  children,
}: {
  src: string;
  alt: string;
  thin?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn('relative aspect-4/5 overflow-hidden bg-wall', thin ? 'rounded-md' : 'rounded-[10px]', className)}>
      <div className={cn('absolute flex items-center justify-center', thin ? 'inset-[10%]' : 'inset-x-[13%] inset-y-[15%]')}>
        {failed ? (
          <span className="text-center text-xs text-muted-foreground">Imagem indisponível</span>
        ) : (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className={cn(
              'max-h-full max-w-full object-contain transition-transform duration-300 ease-out motion-reduce:transition-none',
              thin
                ? 'drop-shadow-[0_3px_4px_rgb(0_0_0/0.25)]'
                : 'drop-shadow-[0_16px_20px_rgb(0_0_0/0.3)] group-hover:-translate-y-1 group-hover:scale-[1.03] motion-reduce:group-hover:transform-none',
            )}
          />
        )}
      </div>
      {children}
    </div>
  );
}

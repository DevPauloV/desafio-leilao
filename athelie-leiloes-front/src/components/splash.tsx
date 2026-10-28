import { cn } from 'cn';

const BRAND = 'Athelie';
const LETTER_STAGGER_MS = 50;

/** Tela de entrada enquanto a sessão é conferida. `leaving`: some com fade por cima do app já montado. */
export function Splash({ leaving = false }: { leaving?: boolean }) {
  return (
    <div
      role="status"
      aria-label="Abrindo o Athelie Leilões"
      className={cn('fixed inset-0 z-50 grid place-items-center bg-background', leaving && 'animate-splash-out')}
    >
      <div aria-hidden="true" className="grid justify-items-center gap-2">
        <b className="flex overflow-hidden pb-1 text-5xl leading-none font-extrabold tracking-[-0.03em] text-primary">
          {[...BRAND].map((letter, i) => (
            <span
              key={i}
              className="animate-splash-rise motion-reduce:animate-none"
              style={{ animationDelay: `${i * LETTER_STAGGER_MS}ms` }}
            >
              {letter}
            </span>
          ))}
        </b>
        <span className="animate-splash-track text-[11px] font-semibold tracking-[0.28em] text-muted-foreground uppercase motion-reduce:animate-none">
          Leilões
        </span>
        <span className="mt-2 h-0.5 w-40 overflow-hidden rounded-full bg-border">
          <span className="block h-full w-[85%] animate-progress bg-primary motion-reduce:animate-none" />
        </span>
      </div>
    </div>
  );
}

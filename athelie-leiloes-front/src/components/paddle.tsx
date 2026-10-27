import { cn } from 'cn';

const paddleNumber = (pseudonym: string) => {
  const hash = pseudonym.indexOf('#');
  return hash >= 0 ? pseudonym.slice(hash) : pseudonym;
};

/** `accent`: bordô sem "Você" (vencedor no comprovante público). */
export function Paddle({ pseudonym, mine = false, accent = false }: { pseudonym: string; mine?: boolean; accent?: boolean }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 font-mono text-[12.5px] whitespace-nowrap', (mine || accent) && 'font-medium text-primary')}
      title={pseudonym}
    >
      <svg viewBox="0 0 12 18" aria-hidden="true" className={cn('h-4.5 w-3 flex-none', mine || accent ? 'text-primary' : 'text-muted-foreground')}>
        <ellipse cx="6" cy="6" rx="5.5" ry="6" fill="currentColor" />
        <rect x="4.6" y="11" width="2.8" height="7" rx="1" fill="currentColor" />
      </svg>
      {mine ? `Você · ${paddleNumber(pseudonym)}` : paddleNumber(pseudonym)}
    </span>
  );
}

export function PaddleNumber({ pseudonym }: { pseudonym: string }) {
  return <b className="font-mono font-semibold">{paddleNumber(pseudonym)}</b>;
}

const BIG_PADDLE_LINE_LENGTH = 5;

export function BigPaddle({ pseudonym }: { pseudonym: string }) {
  const number = paddleNumber(pseudonym);
  return (
    <div aria-hidden="true" className="grid flex-none justify-items-center">
      <div className="grid h-18.5 w-16 place-items-center rounded-full bg-primary text-center font-mono text-xs leading-[1.2] font-medium tracking-[0.04em] text-primary-foreground">
        <span>
          {number.slice(0, BIG_PADDLE_LINE_LENGTH)}
          <br />
          {number.slice(BIG_PADDLE_LINE_LENGTH)}
        </span>
      </div>
      <div className="-mt-0.5 h-6.5 w-3 rounded-b bg-primary" />
    </div>
  );
}

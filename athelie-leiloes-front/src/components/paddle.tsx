import { cn } from 'cn';

// Raquete numerada: o pseudônimo do licitante no lote ("Licitante #7F3A2C") aparece como "#7F3A2C",
// como as raquetes dos leilões presenciais. Os lances da própria pessoa aparecem em bordô, com "Você".

/** "Licitante #7F3A2C" -> "#7F3A2C". */
const paddleNumber = (pseudonym: string) => {
  const hash = pseudonym.indexOf('#');
  return hash >= 0 ? pseudonym.slice(hash) : pseudonym;
};

/** `mine`: o próprio licitante ("Você · #XXXX"). `accent`: destaque em bordô sem "Você" (vencedor no comprovante público). */
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

/** Só o número da raquete, em texto corrido. */
export function PaddleNumber({ pseudonym }: { pseudonym: string }) {
  return <b className="font-mono font-semibold">{paddleNumber(pseudonym)}</b>;
}

/** Quebra do número na raquete grande: "#7F3A" em cima, "2C" embaixo. */
const BIG_PADDLE_LINE_LENGTH = 5;

/** Raquete grande da sala, com o número em duas linhas. */
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

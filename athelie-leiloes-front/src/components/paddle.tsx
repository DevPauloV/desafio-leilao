import { cn } from 'cn';
import { paddleNumber } from '@/lib/paddle';

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

import { LotStatus } from '@/constants';
import { formatMoney } from '@/lib/money';
import { formatCountdown, formatShortDate } from '@/lib/time';
import type { MyLot } from '@/types';

export type LotView = {
  status: string;
  variant: 'accent' | 'neutral' | 'win';
  when: string;
  clock: boolean;
  value: string;
  caption: string;
  valueClassName?: string;
};

/** O que cada linha mostra, conforme a situação do lote. */
export function describe(lot: MyLot, now: number): LotView {
  const money = (cents: number) => formatMoney(cents, { short: true });
  switch (lot.status) {
    case LotStatus.LIVE:
      return {
        status: 'Ao vivo',
        variant: 'accent',
        when: `Faltam ${formatCountdown(new Date(lot.endsAt).getTime() - now)}`,
        clock: true,
        value: money(lot.currentBid ?? lot.startingBid),
        caption: lot.currentBid === null ? 'lance inicial' : 'lance atual',
      };
    case LotStatus.SCHEDULED:
      return { status: 'Agendado', variant: 'neutral', when: `Abre ${formatShortDate(lot.startsAt)}`, clock: false, value: money(lot.startingBid), caption: 'lance inicial' };
    case LotStatus.ENDED: {
      const when = `Encerrou ${formatShortDate(lot.endsAt)}`;
      if (!lot.result) return { status: 'Encerrado', variant: 'neutral', when, clock: false, value: '—', caption: 'apurando resultado' };
      if (lot.result.sold && lot.result.amount !== null) {
        return { status: 'Arrematado', variant: 'win', when, clock: false, value: money(lot.result.amount), caption: 'recebido', valueClassName: 'text-win' };
      }
      return { status: 'Sem lances', variant: 'neutral', when, clock: false, value: money(lot.startingBid), caption: 'não vendido', valueClassName: 'text-muted-foreground' };
    }
    case LotStatus.CANCELLED:
      return {
        status: 'Cancelado',
        variant: 'neutral',
        when: `Fim previsto ${formatShortDate(lot.endsAt)}`,
        clock: false,
        value: money(lot.currentBid ?? lot.startingBid),
        caption: lot.currentBid === null ? 'sem lances' : 'estornado',
        valueClassName: 'text-muted-foreground',
      };
  }
}

export const canCancel = (lot: MyLot) => lot.status === LotStatus.LIVE || lot.status === LotStatus.SCHEDULED;

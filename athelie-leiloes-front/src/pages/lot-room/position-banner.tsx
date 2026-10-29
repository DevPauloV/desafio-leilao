import { CircleAlertIcon, CircleCheckIcon } from 'lucide-react';
import { cn } from 'cn';
import { PaddleNumber } from '@/components/paddle-number';
import { LotStatus } from '@/constants';
import { formatMoney } from '@/lib/money';
import type { LotDetail } from '@/types';

export function PositionBanner({ lot }: { lot: LotDetail }) {
  const me = lot.me;
  if (!me || me.position === null || lot.status !== LotStatus.LIVE) return null;
  const leader = lot.bids[0];
  const [title, text] = me.isLeader
    ? ['Você está ganhando', `Seu lance de ${formatMoney(lot.currentBid ?? 0)} está comprometido na carteira.`]
    : [
        leader ? <>Você foi superado por <PaddleNumber pseudonym={leader.pseudonym} /></> : 'Você foi superado',
        'O valor do seu lance já voltou para o saldo disponível.',
      ];
  const Icon = me.isLeader ? CircleCheckIcon : CircleAlertIcon;
  return (
    <div
      role="status"
      className={cn('flex gap-2.5 rounded-lg px-3.5 py-3 text-sm transition-colors', me.isLeader ? 'bg-win-soft text-win' : 'bg-warn-soft text-warn')}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 flex-none" />
      <span className="grid gap-0.5">
        <b className="font-bold">{title}</b>
        <span className="text-[13px]">{text}</span>
      </span>
    </div>
  );
}

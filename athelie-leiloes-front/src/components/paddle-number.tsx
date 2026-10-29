import { paddleNumber } from '@/lib/paddle';

export function PaddleNumber({ pseudonym }: { pseudonym: string }) {
  return <b className="font-mono font-semibold">{paddleNumber(pseudonym)}</b>;
}

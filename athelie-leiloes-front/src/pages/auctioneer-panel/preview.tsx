import { LotStatus } from '@/constants';
import { LotCard } from '@/pages/showcase/lot-card';
import type { LotSummary, MetArtwork } from '@/types';
import { lotWindow, type Schedule } from './lot-window';

const PREVIEW_ID = 'preview';

/** O mesmo card da vitrine, com os valores digitados; `inert` porque ainda não existe lote para abrir. */
export function Preview({
  artwork,
  startingBid,
  schedule,
  now,
}: {
  artwork: MetArtwork;
  startingBid: number;
  schedule: Schedule;
  now: number;
}) {
  const { start, end } = lotWindow(schedule, now);
  const valid = Number.isFinite(start) && Number.isFinite(end);
  const lot: LotSummary = {
    id: PREVIEW_ID,
    title: artwork.title,
    artist: artwork.artist,
    date: artwork.date,
    medium: artwork.medium,
    department: artwork.department,
    imageUrl: artwork.previewUrl,
    status: schedule.startNow ? LotStatus.LIVE : LotStatus.SCHEDULED,
    startsAt: new Date(valid ? start : now).toISOString(),
    endsAt: new Date(valid ? end : now).toISOString(),
    startingBid,
    currentBid: null,
    bidCount: 0,
  };
  return (
    <div inert className="mx-auto w-full max-w-64 select-none">
      <LotCard lot={lot} now={now} />
    </div>
  );
}

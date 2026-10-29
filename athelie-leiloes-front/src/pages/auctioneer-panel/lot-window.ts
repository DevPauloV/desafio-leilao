export type Schedule = { startNow: boolean; startsAt: string; durationMs: number | null; endsAt: string };

/** Início e fim em ms; NaN quando o campo da data está vazio. */
export function lotWindow(schedule: Schedule, now: number): { start: number; end: number } {
  const start = schedule.startNow ? now : new Date(schedule.startsAt).getTime();
  const end = schedule.durationMs === null ? new Date(schedule.endsAt).getTime() : start + schedule.durationMs;
  return { start, end };
}

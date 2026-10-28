import { LOCALE } from '@/constants';

export const SECOND_MS = 1_000;
export const MINUTE_MS = 60 * SECOND_MS;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

export function clockOffset(serverTime: string): number {
  return new Date(serverTime).getTime() - Date.now();
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / SECOND_MS));
  const days = Math.floor(total / SECONDS_PER_DAY);
  const hours = Math.floor((total % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
  const minutes = Math.floor((total % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(total % SECONDS_PER_MINUTE)}`;
  return days > 0 ? `${days}d ${clock}` : clock;
}

const shortDate = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function formatShortDate(iso: string): string {
  const parts = shortDate.formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')} ${get('month').replace('.', '')}, ${get('hour')}:${get('minute')}`;
}

const clockTime = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' });
const longDate = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const withSeconds = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function formatDateTimeSeconds(iso: string): string {
  const parts = withSeconds.formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')} ${get('month').replace('.', '')}, ${get('hour')}:${get('minute')}:${get('second')}`;
}

export function formatTime(iso: string): string {
  return clockTime.format(new Date(iso));
}

export function formatLongDate(iso: string): string {
  return longDate.format(new Date(iso)).replace(' às ', ', ');
}

/** Para <input type="datetime-local">: no fuso do navegador, não em UTC. */
export function toDateTimeLocal(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `now` é o horário do servidor, não o relógio local. */
export function formatRelative(iso: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / SECOND_MS));
  if (seconds < SECONDS_PER_MINUTE) return `há ${seconds} s`;
  if (seconds < SECONDS_PER_HOUR) return `há ${Math.floor(seconds / SECONDS_PER_MINUTE)} min`;
  if (seconds < SECONDS_PER_DAY) return `há ${Math.floor(seconds / SECONDS_PER_HOUR)} h`;
  return formatShortDate(iso);
}

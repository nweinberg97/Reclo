import { parsePartialDate } from '../schema/validate.ts';
import { PRICE_LABEL, PRICE_WORDS } from './copy.ts';
import type { PriceLevel } from '../schema/types.ts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-11" → "11 Oct 2026"; "2026-05" → "May 2026"; "2026" → "2026". */
export function dateLabel(s: string): string {
  const d = parsePartialDate(s);
  if (!d) return s;
  const parts = s.split('-');
  const month = MONTHS[d.getUTCMonth()]!;
  if (parts.length === 1) return String(d.getUTCFullYear());
  if (parts.length === 2) return `${month} ${d.getUTCFullYear()}`;
  return `${d.getUTCDate()} ${month} ${d.getUTCFullYear()}`;
}

export function priceLabel(p: PriceLevel | null): { short: string; words: string } | null {
  if (p === null) return null;
  return { short: PRICE_LABEL[p], words: PRICE_WORDS[p] };
}

/** "Fri 16 Oct · 7:30 pm", in the event's own local time (taken from its ISO offset). */
export function eventTimeLabel(iso: string): { day: string; time: string } {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return { day: iso, time: '' };
  const [, y, mo, d, h, mi] = m;
  const dow = new Date(Date.UTC(+y!, +mo! - 1, +d!)).getUTCDay();
  const day = `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dow]} ${+d!} ${MONTHS[+mo! - 1]}`;
  const hr = +h!;
  const time = `${hr % 12 || 12}${mi === '00' ? '' : `:${mi}`} ${hr < 12 ? 'am' : 'pm'}`;
  return { day, time };
}

/** Plural-aware count: count(1, 'pick') → "1 pick". */
export function count(n: number, noun: string, plural = `${noun}s`): string {
  return `${n} ${n === 1 ? noun : plural}`;
}

export function hostname(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}

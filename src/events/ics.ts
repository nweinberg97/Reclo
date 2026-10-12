/**
 * Minimal, standards-based iCalendar (RFC 5545) reader for "Events this week".
 *
 * Reclo doesn't depend on any single ticketing company. Instead, each city
 * lists calendar feeds from organisations we trust (concert halls, museums,
 * city calendars) in content/event-feeds.json. Almost every serious venue
 * publishes one, they need no API key, and choosing the feeds is where the
 * quality judgement lives.
 */
import type { EventItem } from '../schema/types.ts';

export interface RawEvent {
  uid: string;
  summary: string;
  start: Date;
  end: Date | null;
  location: string | null;
  url: string | null;
  categories: string | null;
  status: string | null;
}

/** Undo RFC 5545 line folding (continuation lines start with a space or tab). */
export function unfold(ics: string): string[] {
  return ics.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function unescapeText(v: string): string {
  return v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
}

/** Offset in minutes of `timeZone` at the given instant, e.g. -420 for Vancouver in summer. */
export function zoneOffsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** Converts a wall-clock time in a time zone to a real instant. */
export function zonedToInstant(y: number, mo: number, d: number, h: number, mi: number, s: number, timeZone: string): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  let offset = zoneOffsetMinutes(timeZone, new Date(guess));
  let instant = guess - offset * 60000;
  // Second pass handles DST boundaries.
  offset = zoneOffsetMinutes(timeZone, new Date(instant));
  instant = guess - offset * 60000;
  return new Date(instant);
}

function parseDate(value: string, params: string, fallbackZone: string): Date | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h = '00', mi = '00', s = '00', z] = m;
  if (z) return new Date(Date.UTC(+y!, +mo! - 1, +d!, +h, +mi, +s));
  const tzid = params.match(/TZID=([^;:]+)/)?.[1]?.replace(/^"|"$/g, '');
  let zone = fallbackZone;
  if (tzid) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: tzid });
      zone = tzid;
    } catch {
      // Unknown Windows-style TZIDs fall back to the city's zone.
    }
  }
  return zonedToInstant(+y!, +mo!, +d!, +h, +mi, +s, zone);
}

export function parseIcs(ics: string, cityZone: string): RawEvent[] {
  const events: RawEvent[] = [];
  let cur: Record<string, { value: string; params: string }> | null = null;
  for (const line of unfold(ics)) {
    if (line === 'BEGIN:VEVENT') {
      cur = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (cur?.SUMMARY && cur.DTSTART) {
        const start = parseDate(cur.DTSTART.value, cur.DTSTART.params, cityZone);
        if (start) {
          events.push({
            uid: cur.UID?.value ?? `${cur.SUMMARY.value}-${cur.DTSTART.value}`,
            summary: unescapeText(cur.SUMMARY.value),
            start,
            end: cur.DTEND ? parseDate(cur.DTEND.value, cur.DTEND.params, cityZone) : null,
            location: cur.LOCATION ? unescapeText(cur.LOCATION.value) : null,
            url: cur.URL?.value.trim() ?? null,
            categories: cur.CATEGORIES ? unescapeText(cur.CATEGORIES.value) : null,
            status: cur.STATUS?.value.trim().toUpperCase() ?? null,
          });
        }
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const head = line.slice(0, colon);
    const [name, ...params] = head.split(';');
    cur[name!.toUpperCase()] = { value: line.slice(colon + 1), params: params.join(';') };
  }
  return events;
}

/** Formats an instant as ISO 8601 with the city's local offset, e.g. 2026-10-14T19:30:00-07:00. */
export function toZonedIso(date: Date, timeZone: string): string {
  const offset = zoneOffsetMinutes(timeZone, date);
  const local = new Date(date.getTime() + offset * 60000);
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${local.toISOString().slice(0, 19)}${sign}${hh}:${mm}`;
}

export interface FeedConfig {
  /** Display name of the organisation, shown as attribution. */
  name: string;
  /** Public .ics URL. */
  ics: string;
  /** Fallback link when an event has no URL of its own (the organisation's events page). */
  website: string;
  /** Label for these events, e.g. "Concert". */
  kind: string | null;
  /** Default venue when the feed doesn't give one. */
  venue: string | null;
}

/**
 * Keeps events that haven't finished and start within the next `days` days,
 * drops cancelled ones and duplicates, and orders them by start time.
 */
export function selectThisWeek(
  feeds: { feed: FeedConfig; events: RawEvent[] }[],
  now: Date,
  timeZone: string,
  days = 7,
  limit = 40,
): EventItem[] {
  const horizon = now.getTime() + days * 86_400_000;
  const seen = new Set<string>();
  const out: (EventItem & { _t: number })[] = [];
  for (const { feed, events } of feeds) {
    for (const e of events) {
      if (e.status === 'CANCELLED') continue;
      const endsAt = (e.end ?? new Date(e.start.getTime() + 2 * 3600_000)).getTime();
      if (endsAt < now.getTime() || e.start.getTime() > horizon) continue;
      const url = e.url && /^https:\/\//.test(e.url) ? e.url : feed.website;
      const key = `${e.summary.toLowerCase()}|${e.start.toISOString()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: `${e.uid}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60) || key,
        name: e.summary,
        startsAt: toZonedIso(e.start, timeZone),
        endsAt: e.end ? toZonedIso(e.end, timeZone) : null,
        venue: e.location ?? feed.venue ?? feed.name,
        url,
        kind: feed.kind,
        _t: e.start.getTime(),
      });
    }
  }
  return out
    .sort((a, b) => a._t - b._t)
    .slice(0, limit)
    .map(({ _t, ...rest }) => rest);
}

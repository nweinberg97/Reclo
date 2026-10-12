import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIcs, selectThisWeek, toZonedIso, zonedToInstant } from '../../src/events/ics.ts';

const ICS = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT',
  'UID:a1',
  'SUMMARY:Symphony: Mahler 5',
  'DTSTART;TZID=America/Vancouver:20261014T193000',
  'DTEND;TZID=America/Vancouver:20261014T213000',
  'LOCATION:Orpheum\\, Vancouver',
  'URL:https://example.org/mahler',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:past',
  'SUMMARY:Last week',
  'DTSTART:20261001T030000Z',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:c',
  'SUMMARY:Cancelled show',
  'DTSTART:20261013T030000Z',
  'STATUS:CANCELLED',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:long',
  'SUMMARY:A very long title that the',
  '  feed folded onto two lines',
  'DTSTART:20261015T020000Z',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:far',
  'SUMMARY:Next month',
  'DTSTART:20261120T020000Z',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

const feed = { name: 'Test Hall', ics: 'https://example.org/cal.ics', website: 'https://example.org/events', kind: 'Concert', venue: null };

test('reads local times in the right time zone, including folded lines', () => {
  const evs = parseIcs(ICS, 'America/Vancouver');
  const mahler = evs.find((e) => e.uid === 'a1')!;
  assert.equal(mahler.start.toISOString(), '2026-10-15T02:30:00.000Z');
  assert.equal(mahler.location, 'Orpheum, Vancouver');
  assert.equal(evs.find((e) => e.uid === 'long')!.summary, 'A very long title that the feed folded onto two lines');
});

test('this week only: past, cancelled and far-future events disappear', () => {
  const now = new Date('2026-10-12T12:00:00Z');
  const picked = selectThisWeek([{ feed, events: parseIcs(ICS, 'America/Vancouver') }], now, 'America/Vancouver');
  // Ordered by start time: the folded-title event starts 30 minutes before Mahler.
  assert.deepEqual(picked.map((e) => e.name), ['A very long title that the feed folded onto two lines', 'Symphony: Mahler 5']);
  assert.equal(picked[1]!.startsAt, '2026-10-14T19:30:00-07:00');
  // Events without their own https link fall back to the organiser's page.
  assert.equal(picked[0]!.url, 'https://example.org/events');
});

test('offsets are correct on both sides of a DST change', () => {
  assert.equal(toZonedIso(new Date('2026-07-01T19:00:00Z'), 'Europe/London'), '2026-07-01T20:00:00+01:00');
  assert.equal(toZonedIso(new Date('2026-12-01T19:00:00Z'), 'Europe/London'), '2026-12-01T19:00:00+00:00');
  assert.equal(toZonedIso(new Date('2026-12-01T19:00:00Z'), 'Asia/Seoul'), '2026-12-02T04:00:00+09:00');
  assert.equal(zonedToInstant(2026, 11, 1, 12, 0, 0, 'America/New_York').toISOString(), '2026-11-01T17:00:00.000Z');
});

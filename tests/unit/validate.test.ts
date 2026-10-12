import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio, parsePartialDate, validateCities, validateEntry, validateEvents, validateList } from '../../src/schema/validate.ts';
import { SOURCE_MAP, TODAY, entry, ev } from './fixtures.ts';

const msgs = (r: { errors: { message: string }[] }) => r.errors.map((e) => e.message).join(' | ');

test('a well-formed entry with two independent sources passes', () => {
  const r = validateEntry(entry('Good Place', [ev('michelin-guide', { kind: 'award' }), ev('time-out')]), 'x', SOURCE_MAP, TODAY);
  assert.deepEqual(r.errors, []);
});

test('an entry with one piece of evidence fails the build', () => {
  const r = validateEntry(entry('Thin', [ev('time-out')]), 'x', SOURCE_MAP, TODAY);
  assert.match(msgs(r), /at least 2 pieces of evidence/);
});

test('two sources from the same parent company do not count as independent', () => {
  const r = validateEntry(entry('Same owner', [ev('lonely-planet'), ev('the-points-guy')]), 'x', SOURCE_MAP, TODAY);
  assert.match(msgs(r), /2 independent publishers, has 1/);
});

test("a place's own website can't be its evidence", () => {
  const r = validateEntry(
    entry('Self', [ev('time-out'), ev('daily-hive')], { website: `https://dailyhive.com` }),
    'x',
    SOURCE_MAP,
    TODAY,
  );
  assert.match(msgs(r), /own website/);
});

test('evidence URLs must belong to the publisher they are credited to', () => {
  const r = validateEntry(entry('Mismatch', [ev('time-out', { url: 'https://example.net/page' }), ev('daily-hive')]), 'x', SOURCE_MAP, TODAY);
  assert.match(msgs(r), /doesn't belong to Time Out/);
});

test('unknown sources, missing fields and bad dates are rejected', () => {
  const bad = entry('Bad', [ev('nobody'), ev('time-out', { published: '2026-13-01', checked: '2027-01-01' })], {
    why: '',
    lastVerified: '11/10/2026',
  });
  const m = msgs(validateEntry(bad, 'x', SOURCE_MAP, TODAY));
  assert.match(m, /unknown source "nobody"/);
  assert.match(m, /why is required/);
  assert.match(m, /published must be/);
  assert.match(m, /checked is in the future/);
  assert.match(m, /lastVerified must be YYYY-MM-DD/);
});

test('at most one tourism-board source per entry', () => {
  const r = validateEntry(
    entry('Touristy', [ev('tourism', { kind: 'tourism' }), ev('tourism-2', { kind: 'tourism' })]),
    'x',
    SOURCE_MAP,
    TODAY,
  );
  assert.match(msgs(r), /at most one tourism-board source/);
});

test('descriptions longer than one line are rejected', () => {
  const r = validateEntry(entry('Wordy', [ev('time-out'), ev('daily-hive')], { description: 'x'.repeat(200) }), 'x', SOURCE_MAP, TODAY);
  assert.match(msgs(r), /keep it to one line/);
});

test('entries not verified in six months produce a warning, not an error', () => {
  const r = validateEntry(entry('Stale', [ev('time-out'), ev('daily-hive')], { lastVerified: '2026-01-02' }), 'x', SOURCE_MAP, TODAY);
  assert.deepEqual(r.errors, []);
  assert.equal(r.warnings.length, 1);
  assert.match(r.warnings[0]!.message, /not verified for \d+ days/);
});

test('a list rejects duplicates and checks its file name', () => {
  const e = entry('Twice', [ev('time-out'), ev('daily-hive')]);
  const list = { city: 'lisbon', category: 'restaurants', status: 'researched', updated: '2026-10-11', entries: [e, e] };
  const m = msgs(validateList(list, 'lists/lisbon/hotels.json', new Set(['lisbon']), SOURCE_MAP, TODAY));
  assert.match(m, /duplicate id/);
  assert.match(m, /appears twice/);
  assert.match(m, /should be named lists\/lisbon\/restaurants.json/);
});

test('cities need accessible cover colours and real time zones', () => {
  const r = validateCities([
    { id: 'x', name: 'X', localName: null, localLang: null, country: 'Y', timezone: 'Mars/Olympus', accent: '#EEEEEE', accentInk: '#FFFFFF', pattern: 'dots', tagline: 't' },
  ]);
  const m = msgs(r);
  assert.match(m, /contrast/);
  assert.match(m, /unknown time zone/);
});

test('events must carry offsets, https links and attribution', () => {
  const r = validateEvents(
    { city: 'x', source: 's', sourceName: null, events: [{ id: '1', name: 'Gig', venue: 'Hall', url: 'http://a.b', startsAt: '2026-10-12T19:00:00' }] },
    'events/x.json',
    new Set(['x']),
  );
  const m = msgs(r);
  assert.match(m, /url must be https/);
  assert.match(m, /UTC offset/);
  assert.match(m, /sourceName for attribution/);
});

test('partial dates parse and impossible dates are rejected', () => {
  assert.equal(parsePartialDate('2026')?.toISOString().slice(0, 10), '2026-01-01');
  assert.equal(parsePartialDate('2026-05')?.toISOString().slice(0, 10), '2026-05-01');
  assert.equal(parsePartialDate('2026-02-31'), null);
  assert.equal(parsePartialDate('May 2026'), null);
});

test('contrast ratio matches WCAG reference values', () => {
  assert.equal(contrastRatio('#000000', '#FFFFFF').toFixed(1), '21.0');
  assert.equal(contrastRatio('#777777', '#FFFFFF').toFixed(2), '4.48');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankList, recencyFactor, scoreEntry } from '../../src/ranking/rank.ts';
import { SOURCE_MAP, TODAY, entry, ev } from './fixtures.ts';

test('stronger, more independent evidence ranks higher', () => {
  const a = entry('Awarded', [ev('michelin-guide', { kind: 'award' }), ev('time-out')]);
  const b = entry('Listed', [ev('daily-hive'), ev('local-paper')]);
  const ranked = rankList([b, a], SOURCE_MAP, TODAY, 25);
  assert.deepEqual(ranked.map((r) => r.entry.name), ['Awarded', 'Listed']);
  assert.deepEqual(ranked.map((r) => r.rank), [1, 2]);
});

test('a second article from the same publisher group adds nothing', () => {
  const one = scoreEntry(entry('One', [ev('lonely-planet'), ev('time-out')]), SOURCE_MAP, TODAY);
  const sameGroup = scoreEntry(entry('Echo', [ev('lonely-planet'), ev('the-points-guy'), ev('time-out')]), SOURCE_MAP, TODAY);
  assert.equal(sameGroup.total, one.total);
});

test('hype filter: pre-visit buzz counts for half', () => {
  const visited = scoreEntry(entry('V', [ev('time-out'), ev('daily-hive')]), SOURCE_MAP, TODAY);
  const buzz = scoreEntry(entry('B', [ev('time-out', { afterVisit: false }), ev('daily-hive')]), SOURCE_MAP, TODAY);
  assert.ok(buzz.total < visited.total);
  assert.ok(buzz.items[0]!.discounts.includes('not written after a visit'));
});

test('hype filter: same-week announcements collapse into one', () => {
  const pr = entry('Press push', [
    ev('time-out', { afterVisit: false, published: '2026-09-01' }),
    ev('daily-hive', { afterVisit: false, published: '2026-09-02' }),
    ev('local-paper', { afterVisit: false, published: '2026-09-03' }),
  ]);
  const spread = entry('Organic', [
    ev('time-out', { afterVisit: false, published: '2026-03-01' }),
    ev('daily-hive', { afterVisit: false, published: '2026-06-02' }),
    ev('local-paper', { afterVisit: false, published: '2026-09-03' }),
  ]);
  const a = scoreEntry(pr, SOURCE_MAP, TODAY);
  const b = scoreEntry(spread, SOURCE_MAP, TODAY);
  assert.equal(a.items.filter((i) => i.points === 0).length, 2);
  assert.ok(a.total < b.total);
});

test('reviews after a visit are never collapsed, even in the same week', () => {
  const s = scoreEntry(
    entry('Busy week', [ev('time-out', { published: '2026-09-01' }), ev('daily-hive', { published: '2026-09-02' })]),
    SOURCE_MAP,
    TODAY,
  );
  assert.ok(s.items.every((i) => i.points > 0));
});

test('recent evidence counts more than old evidence', () => {
  assert.equal(recencyFactor('2026-01-01', TODAY), 1);
  assert.equal(recencyFactor('2024-06', TODAY), 0.85);
  assert.equal(recencyFactor('2022', TODAY), 0.7);
  assert.equal(recencyFactor('2015', TODAY), 0.55);
  assert.equal(recencyFactor(null, TODAY), 0.9);
});

test('variety: a fourth place of the same style must beat a different style by more', () => {
  const ramen = [1, 2, 3, 4].map((n) => entry(`Ramen ${n}`, [ev('time-out'), ev('daily-hive')], { subtype: 'ramen', neighbourhood: `Hood ${n}` }));
  // Slightly weaker evidence than the ramen shops, but a different style.
  const bakery = entry('Bakery', [ev('time-out', { published: '2024-06-01' }), ev('daily-hive')], { subtype: 'bakery', neighbourhood: 'Elsewhere' });
  const ranked = rankList([...ramen, bakery], SOURCE_MAP, TODAY, 25);
  assert.equal(ranked[3]!.entry.name, 'Bakery');
  assert.equal(ranked.length, 5);
});

test('lists are capped at the list size and ranking is deterministic', () => {
  const many = Array.from({ length: 40 }, (_, i) => entry(`Place ${String(i).padStart(2, '0')}`, [ev('time-out'), ev('daily-hive')], { subtype: `style ${i}` }));
  const a = rankList(many, SOURCE_MAP, TODAY, 25).map((r) => r.entry.name);
  const b = rankList([...many].reverse(), SOURCE_MAP, TODAY, 25).map((r) => r.entry.name);
  assert.equal(a.length, 25);
  assert.deepEqual(a, b);
});

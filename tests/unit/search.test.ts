import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeDoc, normalize, search, withinOneEdit } from '../../src/search/search.ts';
import { slugify } from '../../src/lib/slug.ts';

const index = [
  makeDoc({ t: 'city', u: 'lisbon/', n: 'Lisbon', s: 'Portugal', names: ['Lisbon', 'Lisboa'], keywords: ['Portugal'] }),
  makeDoc({ t: 'city', u: 'seoul/', n: 'Seoul', s: 'South Korea', names: ['Seoul', '서울'], keywords: [] }),
  makeDoc({ t: 'city', u: 'tokyo/', n: 'Tokyo', s: 'Japan', names: ['Tokyo', '東京'], keywords: [] }),
  makeDoc({ t: 'list', u: 'lisbon/restaurants/', n: 'Restaurants & cafés in Lisbon', s: 'List', names: ['Lisbon'], keywords: ['restaurants cafés coffee food'] }),
  makeDoc({ t: 'pick', u: 'lisbon/restaurants/cafe-a/', n: 'Café A Brasileira', s: 'Chiado', names: ['Café A Brasileira'], keywords: ['café', 'Lisbon', 'Chiado'], r: 3 }),
  makeDoc({ t: 'pick', u: 'paris/restaurants/cafe-a/', n: 'Café A', s: 'Paris', names: ['Café A'], keywords: ['café', 'Paris'], r: 1 }),
  makeDoc({ t: 'pick', u: 'vancouver/things-to-do/moa/', n: 'Museum of Anthropology', s: 'UBC', names: ['Museum of Anthropology'], keywords: ['museum', 'Vancouver'], r: 4 }),
  makeDoc({ t: 'pick', u: 'seoul/restaurants/x/', n: '광장시장', s: 'Market', names: ['광장시장', 'Gwangjang Market'], keywords: ['Seoul', 'market'], r: 2 }),
];

const top = (q: string) => search(index, q).map((h) => h.doc.u);

test('accents are ignored: cafe finds café', () => {
  assert.ok(top('cafe').includes('lisbon/restaurants/cafe-a/'));
  assert.equal(normalize('Ciudad de México'), 'ciudad de mexico');
});

test('local names in their own script are searchable', () => {
  assert.equal(top('서울')[0], 'seoul/');
  assert.equal(top('東京')[0], 'tokyo/');
  assert.equal(top('Lisboa')[0], 'lisbon/');
  assert.ok(top('광장').includes('seoul/restaurants/x/'));
});

test('type-ahead prefixes match', () => {
  assert.equal(top('lis')[0], 'lisbon/');
  assert.ok(top('anthro').includes('vancouver/things-to-do/moa/'));
});

test('one typo is forgiven in longer words', () => {
  assert.ok(top('musuem').includes('vancouver/things-to-do/moa/'));
  assert.ok(withinOneEdit('museum', 'musuem'));
  assert.ok(!withinOneEdit('museum', 'mosque'));
});

test('multi-word queries narrow results, and filler words are ignored', () => {
  const r = top('best cafe in lisbon');
  assert.equal(r.includes('paris/restaurants/cafe-a/'), false);
  assert.ok(r.includes('lisbon/restaurants/cafe-a/'));
});

test('cities outrank places when both match', () => {
  index.push(makeDoc({ t: 'pick', u: 'x/lisbon-bar/', n: 'Lisbon Bar', s: '', names: ['Lisbon Bar'], keywords: [] }));
  assert.equal(top('lisbon')[0], 'lisbon/');
});

test('lists still being researched sink below real picks', () => {
  const idx = [
    makeDoc({ t: 'list', u: 'paris/restaurants/', n: 'Restaurants & cafés in Paris', s: '', names: ['Paris'], keywords: ['cafés'], empty: true }),
    makeDoc({ t: 'pick', u: 'vancouver/restaurants/revolver/', n: 'Revolver', s: '', names: ['Revolver'], keywords: ['café'], r: 24 }),
  ];
  assert.equal(search(idx, 'cafe')[0]!.doc.u, 'vancouver/restaurants/revolver/');
});

test('nothing matches nonsense, and empty queries return nothing', () => {
  assert.deepEqual(top('zzzzqx'), []);
  assert.deepEqual(top('   '), []);
});

test('slugs are clean, stable and handle non-Latin names', () => {
  assert.equal(slugify("Café de l'Époque & Co."), 'cafe-de-lepoque-and-co');
  assert.equal(slugify('L&B Spumoni Gardens'), 'l-and-b-spumoni-gardens');
  assert.match(slugify('東京'), /^place-[a-z0-9]+$/);
  assert.equal(slugify('東京'), slugify('東京'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { namesMatch } from '../../src/lib/place-match.ts';

test('photo matching accepts the same place under a slightly different name', () => {
  assert.ok(namesMatch('Hotel Georgia', 'Rosewood Hotel Georgia'));
  assert.ok(namesMatch('Metropolitan Museum of Art', 'The Metropolitan Museum of Art'));
  assert.ok(namesMatch('Katz’s Delicatessen', "Katz's Delicatessen"));
  assert.ok(namesMatch('The Cloisters', 'The Met Cloisters'));
});

test('photo matching rejects near-misses that would show the wrong place', () => {
  assert.equal(namesMatch('The Bowery House', 'The Bowery Hotel'), false);
  assert.equal(namesMatch('The Ritz-Carlton New York, Central Park', 'The Ritz-Carlton New York, NoMad'), false);
  assert.equal(namesMatch('Toronto Island Park Disc Golf Course', 'Toronto Island Park'), false);
  assert.equal(namesMatch('Commercial–Broadway station', 'Commercial Drive'), false);
});

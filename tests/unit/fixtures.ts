import type { Entry, Evidence, Source } from '../../src/schema/types.ts';

export const TODAY = new Date('2026-10-11T00:00:00Z');

export const SOURCES: Source[] = [
  { id: 'michelin-guide', name: 'Michelin Guide', domains: ['guide.michelin.com'], tier: 1, group: 'michelin' },
  { id: 'time-out', name: 'Time Out', domains: ['timeout.com'], tier: 2, group: 'time-out' },
  { id: 'lonely-planet', name: 'Lonely Planet', domains: ['lonelyplanet.com'], tier: 2, group: 'red-ventures' },
  { id: 'the-points-guy', name: 'The Points Guy', domains: ['thepointsguy.com'], tier: 3, group: 'red-ventures' },
  { id: 'daily-hive', name: 'Daily Hive', domains: ['dailyhive.com'], tier: 3, group: 'daily-hive' },
  { id: 'local-paper', name: 'Local Paper', domains: ['localpaper.example.com'], tier: 3, group: 'local-paper' },
  { id: 'tourism', name: 'City Tourism', domains: ['visit.example.com'], tier: 3, group: 'tourism' },
  { id: 'tourism-2', name: 'Other Tourism', domains: ['go.example.com'], tier: 3, group: 'tourism-2' },
];
export const SOURCE_MAP = new Map(SOURCES.map((s) => [s.id, s]));

export function ev(source: string, overrides: Partial<Evidence> = {}): Evidence {
  const domain = SOURCE_MAP.get(source)?.domains[0] ?? 'unknown.example.com';
  return {
    source,
    url: `https://${domain}/${Math.random().toString(36).slice(2)}`,
    title: 'A page',
    kind: 'guide',
    published: '2026-05-01',
    afterVisit: true,
    supports: 'Recommends it.',
    checked: '2026-10-11',
    ...overrides,
  };
}

export function entry(name: string, evidence: Evidence[], overrides: Partial<Entry> = {}): Entry {
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    localName: null,
    neighbourhood: 'Downtown',
    subtype: 'restaurant',
    description: 'A good place.',
    why: 'Everyone who has been says so.',
    price: 2,
    website: 'https://place.example.org',
    address: null,
    image: null,
    note: null,
    evidence,
    lastVerified: '2026-10-11',
    closureCheck: 'Official site shows current hours.',
    ...overrides,
  };
}

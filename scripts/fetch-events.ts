/**
 * Refreshes "Events this week" for every city from the calendar feeds listed in
 * content/event-feeds.json, writing content/events/<city>.json. Runs daily in
 * GitHub Actions before the build. No API keys, no tracking, no ticketing middlemen.
 *
 * A city with no feeds gets an honest empty file, and the Events tab says so.
 * If a feed can't be reached, that city keeps its previous events; the build
 * removes anything that has already happened.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { City, EventsFile } from '../src/schema/types.ts';
import { type FeedConfig, parseIcs, selectThisWeek } from '../src/events/ics.ts';

const root = join(import.meta.dirname, '..');
const cities: City[] = JSON.parse(readFileSync(join(root, 'content/cities.json'), 'utf8'));
const feedsPath = join(root, 'content/event-feeds.json');
const feeds: Record<string, FeedConfig[]> = existsSync(feedsPath) ? JSON.parse(readFileSync(feedsPath, 'utf8')) : {};
const outDir = join(root, 'content/events');
mkdirSync(outDir, { recursive: true });

async function getText(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000), headers: { 'user-agent': 'Reclo events (+https://github.com/nweinberg97/Reclo)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

const now = new Date();
let failures = 0;
for (const city of cities) {
  const cityFeeds = feeds[city.id] ?? [];
  const path = join(outDir, `${city.id}.json`);
  if (cityFeeds.length === 0) {
    const empty: EventsFile = { city: city.id, source: null, sourceName: null, sourceUrl: null, fetchedAt: null, events: [] };
    writeFileSync(path, `${JSON.stringify(empty, null, 2)}\n`);
    continue;
  }
  const results = [];
  for (const feed of cityFeeds) {
    try {
      results.push({ feed, events: parseIcs(await getText(feed.ics), city.timezone) });
    } catch (err) {
      failures++;
      console.warn(`  ! ${city.name}: couldn't read ${feed.name} (${(err as Error).message})`);
    }
  }
  if (results.length === 0) {
    console.warn(`  ! ${city.name}: no feeds reachable; keeping previous events`);
    continue;
  }
  const file: EventsFile = {
    city: city.id,
    source: 'ics',
    sourceName: results.map((r) => r.feed.name).join(', '),
    sourceUrl: results.length === 1 ? results[0]!.feed.website : null,
    fetchedAt: now.toISOString(),
    events: selectThisWeek(results, now, city.timezone),
  };
  writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`);
  console.log(`${city.name}: ${file.events.length} events this week`);
}
if (failures) console.warn(`${failures} feed(s) failed; see warnings above.`);

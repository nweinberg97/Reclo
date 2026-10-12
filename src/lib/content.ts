/**
 * Loads, validates and ranks all content. This is the single entry point the
 * build uses; if validation fails, it throws and the build stops.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  type City,
  type EventsFile,
  type ListFile,
  type Source,
  type StaticCategoryId,
  LIST_SIZE,
  STATIC_CATEGORIES,
} from '../schema/types.ts';
import { type Problem, validateCities, validateEvents, validateList, validateSources } from '../schema/validate.ts';
import { type RankedEntry, rankList } from '../ranking/rank.ts';

export interface RankedList {
  city: City;
  category: StaticCategoryId;
  status: ListFile['status'];
  updated: string | null;
  picks: RankedEntry[];
  /** Verified entries that didn't make the top LIST_SIZE. */
  backups: number;
}

export interface Content {
  cities: City[];
  sources: Map<string, Source>;
  lists: Map<string, RankedList>;
  events: Map<string, EventsFile>;
  warnings: Problem[];
}

export const listKey = (city: string, category: string) => `${city}/${category}`;

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`${path}: ${(err as Error).message}`);
  }
}

export class ContentError extends Error {
  constructor(readonly problems: Problem[]) {
    super(`Content has ${problems.length} problem(s):\n${problems.map((p) => `  ✗ ${p.where}: ${p.message}`).join('\n')}`);
  }
}

export function loadContent(contentDir: string, today: Date): Content {
  const errors: Problem[] = [];
  const warnings: Problem[] = [];

  const citiesRaw = readJson(join(contentDir, 'cities.json'));
  const sourcesRaw = readJson(join(contentDir, 'sources.json'));
  errors.push(...validateCities(citiesRaw).errors, ...validateSources(sourcesRaw).errors);
  if (errors.length) throw new ContentError(errors);

  const cities = citiesRaw as City[];
  const cityIds = new Set(cities.map((c) => c.id));
  const sources = new Map((sourcesRaw as Source[]).map((s) => [s.id, s]));

  // Every file under lists/ must be valid, including ones for unknown cities (caught as errors).
  const listsDir = join(contentDir, 'lists');
  const rawLists = new Map<string, ListFile>();
  if (existsSync(listsDir)) {
    for (const cityDir of readdirSync(listsDir)) {
      for (const f of readdirSync(join(listsDir, cityDir))) {
        if (!f.endsWith('.json')) continue;
        const path = join(listsDir, cityDir, f);
        const data = readJson(path);
        const r = validateList(data, relative(contentDir, path), cityIds, sources, today);
        errors.push(...r.errors);
        warnings.push(...r.warnings);
        if (r.errors.length === 0) rawLists.set(listKey(cityDir, f.replace(/\.json$/, '')), data as ListFile);
      }
    }
  }

  const events = new Map<string, EventsFile>();
  const eventsDir = join(contentDir, 'events');
  for (const city of cities) {
    const path = join(eventsDir, `${city.id}.json`);
    if (!existsSync(path)) {
      events.set(city.id, { city: city.id, source: null, sourceName: null, sourceUrl: null, fetchedAt: null, events: [] });
      continue;
    }
    const data = readJson(path);
    const r = validateEvents(data, relative(contentDir, path), cityIds);
    errors.push(...r.errors);
    if (r.errors.length === 0) events.set(city.id, data as EventsFile);
  }

  if (errors.length) throw new ContentError(errors);

  const lists = new Map<string, RankedList>();
  for (const city of cities) {
    for (const category of STATIC_CATEGORIES) {
      const file = rawLists.get(listKey(city.id, category));
      const picks = file ? rankList(file.entries, sources, today, LIST_SIZE) : [];
      lists.set(listKey(city.id, category), {
        city,
        category,
        status: file?.status ?? 'researching',
        updated: file?.updated ?? null,
        picks,
        backups: file ? file.entries.length - picks.length : 0,
      });
    }
  }
  return { cities, sources, lists, events, warnings };
}

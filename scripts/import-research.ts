/**
 * Turns a researcher's file (research/raw/<city>-<category>.json, written to
 * research/RESEARCH_BRIEF.md) into a published list in content/lists.
 *
 *   npm run import -- research/raw/lisbon-restaurants.json [--exclude "Name" ...]
 *
 * It maps each evidence URL to a publisher in content/sources.json (add new
 * publishers there first), keeps the four strongest pieces of evidence, writes
 * slugs, and stamps verification dates. The build's validator then checks the
 * result; nothing is published that fails it.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Entry, Evidence, EvidenceKind, ListFile, PriceLevel, Source, StaticCategoryId } from '../src/schema/types.ts';
import { hostMatches } from '../src/schema/validate.ts';
import { slugify } from '../src/lib/slug.ts';
import { TIER_WEIGHT, KIND_WEIGHT, recencyFactor } from '../src/ranking/rank.ts';

interface RawEvidence {
  publisher: string;
  domain: string;
  url: string;
  title: string;
  kind: EvidenceKind;
  published: string | null;
  afterVisit: boolean;
  supports: string;
}
interface RawEntry {
  name: string;
  localName: string | null;
  neighbourhood: string | null;
  subtype: string;
  description: string;
  why: string;
  price: number | null;
  website: string | null;
  address: string | null;
  note?: string | null;
  evidence: RawEvidence[];
  closureCheck: string;
}
interface RawFile {
  city: string;
  category: StaticCategoryId;
  researchedOn: string;
  entries: RawEntry[];
}

const root = join(dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const file = args[0];
if (!file) {
  console.error('Usage: tsx scripts/import-research.ts <research file> [--exclude "Name"]...');
  process.exit(1);
}
const exclude = new Set<string>();
for (let i = 1; i < args.length; i++) if (args[i] === '--exclude' && args[i + 1]) exclude.add(args[++i]!.toLowerCase());

const sources: Source[] = JSON.parse(readFileSync(join(root, 'content/sources.json'), 'utf8'));
const raw: RawFile = JSON.parse(readFileSync(file, 'utf8'));
const today = new Date(`${raw.researchedOn}T00:00:00Z`);

function findSource(url: string): Source {
  const s = sources.find((src) => hostMatches(url, src.domains));
  if (!s) throw new Error(`No publisher in content/sources.json for ${url}. Add it (with a tier and group) and re-run.`);
  return s;
}

function strength(ev: Evidence): number {
  const src = findSource(ev.url);
  return TIER_WEIGHT[src.tier] * KIND_WEIGHT[ev.kind] * (ev.afterVisit ? 1 : 0.5) * recencyFactor(ev.published, today);
}

const cleanUrl = (u: string) => u.replace(/^http:\/\//, 'https://').replace(/^https:\/\/amp\.cbc\.ca\//, 'https://www.cbc.ca/');

const entries: Entry[] = [];
const usedIds = new Set<string>();
for (const r of raw.entries) {
  if (exclude.has(r.name.toLowerCase())) {
    console.log(`  excluded: ${r.name}`);
    continue;
  }
  let evidence: Evidence[] = r.evidence.map((e) => {
    const url = cleanUrl(e.url);
    return {
      source: findSource(url).id,
      url,
      title: e.title.trim(),
      kind: e.kind,
      published: e.published,
      afterVisit: e.afterVisit,
      supports: e.supports.trim(),
      checked: raw.researchedOn,
    };
  });
  // Keep the strongest piece per publisher, then the four strongest overall.
  const byPublisher = new Map<string, Evidence>();
  for (const ev of evidence) {
    const prev = byPublisher.get(ev.source);
    if (!prev || strength(ev) > strength(prev)) byPublisher.set(ev.source, ev);
  }
  evidence = [...byPublisher.values()].sort((a, b) => strength(b) - strength(a)).slice(0, 4);

  let id = slugify(r.name);
  if (usedIds.has(id)) id = `${id}-${slugify(r.neighbourhood ?? '2')}`;
  usedIds.add(id);

  entries.push({
    id,
    name: r.name.trim(),
    localName: r.localName ?? null,
    neighbourhood: r.neighbourhood ?? null,
    subtype: r.subtype.trim(),
    description: r.description.trim(),
    why: r.why.trim(),
    price: (r.price ?? null) as PriceLevel | null,
    website: r.website ? cleanUrl(r.website) : null,
    address: r.address ?? null,
    image: null,
    note: r.note ?? null,
    evidence,
    lastVerified: raw.researchedOn,
    closureCheck: r.closureCheck.trim(),
  });
}

const out: ListFile = {
  city: raw.city,
  category: raw.category,
  status: 'researched',
  updated: raw.researchedOn,
  entries,
};
const dest = join(root, 'content/lists', raw.city, `${raw.category}.json`);
mkdirSync(dirname(dest), { recursive: true });
if (existsSync(dest)) console.log(`  replacing ${dest}`);
writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Imported ${entries.length} entries → ${dest}`);

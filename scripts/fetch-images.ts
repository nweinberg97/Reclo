/**
 * Finds a photo for every city and every published pick, then saves resized
 * copies into content/images/ with a credit for each. Runs in GitHub Actions
 * (.github/workflows/images.yml), which commits the results.
 *
 * Where photos come from, in order:
 *   1. Wikimedia Commons, via the place's Wikidata entry (its curated main image).
 *      Only free licences (CC0, public domain, CC BY, CC BY-SA). Credited to the photographer.
 *   2. The place's own share image: the og:image its official website publishes
 *      for link previews. Credited to the website and linked back. Owners can ask
 *      for removal from the pick page, and listing an id in content/image-optout.json
 *      removes it on the next run.
 *   3. Nothing: the site shows the designed illustration instead.
 *
 * Existing images are kept (delete one to refetch it). Run with --force to refetch all.
 * A contact sheet of matches is written to content/images/REVIEW.md so a human
 * can spot a wrong photo, and content/image-overrides.json can pin or block one.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import type { City, ListFile } from '../src/schema/types.ts';
import { namesMatch } from '../src/lib/place-match.ts';

const root = join(import.meta.dirname, '..');
const outDir = join(root, 'content/images');
const UA = 'RecloImageBot/1.0 (https://github.com/nweinberg97/Reclo; open-source city guide)';
const FORCE = process.argv.includes('--force');
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7);

export interface ImageRecord {
  /** Path of the large image, relative to content/images. */
  file: string;
  /** Path of the small image, relative to content/images. */
  small: string;
  width: number;
  height: number;
  /** "commons" for freely licensed, "website" for the place's own share image. */
  kind: 'commons' | 'website';
  credit: string;
  license: string | null;
  sourceUrl: string;
  /** Dominant colour, used as a placeholder while the photo loads. */
  color: string;
}
type Manifest = Record<string, ImageRecord>;

interface Override {
  /** Commons file title ("File:...") or an https image URL to use instead. */
  use?: string;
  /** Never show a photo for this key. */
  block?: boolean;
}

const manifestPath = join(outDir, 'manifest.json');
const manifest: Manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const overridesPath = join(root, 'content/image-overrides.json');
const overrides: Record<string, Override> = existsSync(overridesPath) ? JSON.parse(readFileSync(overridesPath, 'utf8')) : {};
const optoutPath = join(root, 'content/image-optout.json');
const optout: string[] = existsSync(optoutPath) ? JSON.parse(readFileSync(optoutPath, 'utf8')) : [];
const review: string[] = [];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(url: string): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
    if (res.status === 429) {
      await sleep(3000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return (await res.json()) as T;
  }
  throw new Error(`Rate limited: ${url}`);
}

// ---------- Wikidata + Commons ----------

interface Claims {
  [prop: string]: { mainsnak: { datavalue?: { value: unknown } } }[];
}
interface Entity {
  id: string;
  labels?: Record<string, { value: string }>;
  claims?: Claims;
}

function claim<T>(e: Entity, prop: string): T | null {
  return (e.claims?.[prop]?.[0]?.mainsnak.datavalue?.value as T) ?? null;
}

function km(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.latitude * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function entities(ids: string[]): Promise<Entity[]> {
  if (!ids.length) return [];
  const data = await getJson<{ entities: Record<string, Entity> }>(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join('|')}&props=claims|labels&languages=en&format=json`,
  );
  return Object.values(data.entities);
}

/** Finds the Wikidata item for a place: name must match and it must be within reach of the city. */
async function findPlace(name: string, city: { latitude: number; longitude: number }, maxKm: number): Promise<{ entity: Entity; file: string } | null> {
  const queries = [name, name.replace(/\s*\(.*?\)\s*/g, ' ').replace(/,.*$/, '').trim()];
  const seen = new Set<string>();
  for (const q of queries) {
    const res = await getJson<{ search: { id: string; label?: string }[] }>(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(q)}&language=en&type=item&limit=8&format=json`,
    );
    const ids = res.search.map((s) => s.id).filter((id) => !seen.has(id));
    ids.forEach((id) => seen.add(id));
    for (const e of await entities(ids)) {
      const file = claim<string>(e, 'P18');
      const coord = claim<{ latitude: number; longitude: number }>(e, 'P625');
      const label = e.labels?.en?.value ?? '';
      if (!file || !coord) continue;
      if (km(coord, city) > maxKm) continue;
      if (!namesMatch(label, name)) continue;
      return { entity: e, file };
    }
    await sleep(150);
  }
  return null;
}

const FREE = /^(cc0|cc[- ]by(-sa)?[- ]\d(\.\d)?.*|cc[- ]by(-sa)?$|public domain|pd.*)$/i;

async function commonsInfo(file: string): Promise<{ url: string; credit: string; license: string; sourceUrl: string } | null> {
  const title = file.startsWith('File:') ? file : `File:${file}`;
  const data = await getJson<{ query: { pages: Record<string, { imageinfo?: { thumburl: string; descriptionurl: string; extmetadata: Record<string, { value: string }> }[] }> } }>(
    `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1800&format=json`,
  );
  const info = Object.values(data.query.pages)[0]?.imageinfo?.[0];
  if (!info) return null;
  const license = (info.extmetadata.LicenseShortName?.value ?? '').trim();
  if (!FREE.test(license)) {
    review.push(`- skipped ${title}: licence "${license}" isn't free`);
    return null;
  }
  const artist = (info.extmetadata.Artist?.value ?? 'Unknown')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return { url: info.thumburl, credit: artist || 'Unknown photographer', license, sourceUrl: info.descriptionurl };
}

// ---------- The place's own share image ----------

async function websiteImage(site: string): Promise<{ url: string; credit: string; sourceUrl: string } | null> {
  try {
    const res = await fetch(site, { headers: { 'user-agent': `Mozilla/5.0 (compatible; ${UA})`, accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 400_000);
    const meta = (prop: string) =>
      html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i'))?.[1] ??
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i'))?.[1];
    const raw = meta('og:image') ?? meta('og:image:url') ?? meta('twitter:image');
    if (!raw) return null;
    const url = new URL(raw.replace(/&amp;/g, '&'), res.url).toString();
    if (!/^https?:/.test(url)) return null;
    const host = new URL(res.url).hostname.replace(/^www\./, '');
    return { url, credit: host, sourceUrl: site };
  } catch {
    return null;
  }
}

// ---------- Download + resize ----------

/**
 * Logos and wordmarks are mostly one flat colour: on a 48×48 thumbnail, the
 * commonest colour covers over 45% of pixels, or there are very few colours at all.
 */
async function looksLikeLogo(buf: Buffer): Promise<boolean> {
  const { data } = await sharp(buf, { failOn: 'none' }).resize(48, 48, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const buckets = new Map<number, number>();
  for (let i = 0; i < data.length; i += 3) {
    const k = ((data[i]! >> 5) << 6) | ((data[i + 1]! >> 5) << 3) | (data[i + 2]! >> 5);
    buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }
  const top = Math.max(...buckets.values()) / (48 * 48);
  return top > 0.45 || buckets.size <= 16;
}

async function save(key: string, url: string, meta: Omit<ImageRecord, 'file' | 'small' | 'width' | 'height' | 'color'>): Promise<ImageRecord | null> {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? '';
    if (!type.startsWith('image/') || type.includes('svg')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const img = sharp(buf, { failOn: 'none' }).rotate();
    const m = await img.metadata();
    if (!m.width || !m.height || m.width < 480 || m.height < 300) {
      review.push(`- skipped ${key}: image too small (${m.width}×${m.height})`);
      return null;
    }
    // Logos and graphics make bad photos: skip very wide or tall images and near-flat colour.
    const ratio = m.width / m.height;
    if (ratio > 3 || ratio < 0.5) return null;
    const stats = await sharp(buf).stats();
    if (meta.kind === 'website' && (await looksLikeLogo(buf))) {
      review.push(`- skipped ${key}: looks like a logo, not a photo`);
      return null;
    }
    const dir = join(outDir, ...key.split('/').slice(0, -1));
    mkdirSync(dir, { recursive: true });
    const base = key.split('/').at(-1)!;
    const large = await sharp(buf, { failOn: 'none' }).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 74 }).toBuffer({ resolveWithObject: true });
    await sharp(buf, { failOn: 'none' }).rotate().resize({ width: 720, withoutEnlargement: true }).webp({ quality: 70 }).toFile(join(dir, `${base}-720.webp`));
    writeFileSync(join(dir, `${base}-1600.webp`), large.data);
    const { dominant } = stats;
    const color = `#${[dominant.r, dominant.g, dominant.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    const rel = key.split('/').slice(0, -1).join('/');
    return {
      file: `${rel ? `${rel}/` : ''}${base}-1600.webp`,
      small: `${rel ? `${rel}/` : ''}${base}-720.webp`,
      width: large.info.width,
      height: large.info.height,
      color,
      ...meta,
    };
  } catch (err) {
    review.push(`- failed ${key}: ${(err as Error).message}`);
    return null;
  }
}

async function resolve(key: string, opts: { name: string; city: { latitude: number; longitude: number } | null; website: string | null; maxKm: number; qid?: string | null }): Promise<void> {
  if (ONLY && !key.startsWith(ONLY)) return;
  const ov = overrides[key];
  if (ov?.block || optout.includes(key)) {
    if (manifest[key]) review.push(`- removed ${key} (blocked or opted out)`);
    delete manifest[key];
    return;
  }
  if (manifest[key] && !FORCE && !ov?.use) return;

  // 1. Freely licensed.
  let file: string | null = ov?.use?.startsWith('File:') ? ov.use : null;
  let matched = '';
  if (!file && opts.qid) {
    const [e] = await entities([opts.qid]);
    file = e ? claim<string>(e, 'P18') : null;
    matched = opts.qid;
  }
  if (!file && opts.city && !ov?.use) {
    const found = await findPlace(opts.name, opts.city, opts.maxKm);
    if (found) {
      file = found.file;
      matched = `${found.entity.id} (${found.entity.labels?.en?.value ?? ''})`;
    }
  }
  if (file) {
    const info = await commonsInfo(file);
    if (info) {
      const rec = await save(key, info.url, { kind: 'commons', credit: info.credit, license: info.license, sourceUrl: info.sourceUrl });
      if (rec) {
        manifest[key] = rec;
        review.push(`- ✓ ${key} ← Commons ${file} via ${matched || 'override'} · ${info.credit}, ${info.license}`);
        return;
      }
    }
  }
  // 2. The place's own share image.
  const direct = ov?.use && /^https:/.test(ov.use) ? { url: ov.use, credit: new URL(ov.use).hostname.replace(/^www\./, ''), sourceUrl: opts.website ?? ov.use } : null;
  const site = direct ?? (opts.website ? await websiteImage(opts.website) : null);
  if (site) {
    const rec = await save(key, site.url, { kind: 'website', credit: site.credit, license: null, sourceUrl: site.sourceUrl });
    if (rec) {
      manifest[key] = rec;
      review.push(`- ✓ ${key} ← website ${site.url}`);
      return;
    }
  }
  review.push(`- · ${key}: no photo found, illustration will be used`);
}

// ---------- Run ----------

const cities: (City & { wikidata?: string })[] = JSON.parse(readFileSync(join(root, 'content/cities.json'), 'utf8'));
const centres = new Map<string, { latitude: number; longitude: number }>();
for (const e of await entities(cities.map((c) => c.wikidata).filter(Boolean) as string[])) {
  const coord = claim<{ latitude: number; longitude: number }>(e, 'P625');
  const city = cities.find((c) => c.wikidata === e.id);
  if (coord && city) centres.set(city.id, coord);
}

for (const city of cities) {
  await resolve(`cities/${city.id}`, { name: city.name, city: null, website: null, maxKm: 0, qid: city.wikidata ?? null });
}

const listsDir = join(root, 'content/lists');
for (const cityId of readdirSync(listsDir)) {
  for (const f of readdirSync(join(listsDir, cityId))) {
    const list: ListFile = JSON.parse(readFileSync(join(listsDir, cityId, f), 'utf8'));
    for (const e of list.entries) {
      await resolve(`${cityId}/${list.category}/${e.id}`, {
        name: e.name,
        city: centres.get(cityId) ?? null,
        website: e.website,
        // Day trips (mountains, parks) can sit a little outside the city.
        maxKm: list.category === 'things-to-do' ? 45 : 30,
      });
      await sleep(120);
    }
  }
}

mkdirSync(outDir, { recursive: true });
const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`);
const counts = Object.values(manifest).reduce((acc, r) => ((acc[r.kind] = (acc[r.kind] ?? 0) + 1), acc), {} as Record<string, number>);
writeFileSync(
  join(outDir, 'REVIEW.md'),
  `# Photo review\n\nLast run ${new Date().toISOString().slice(0, 10)}. ${Object.keys(manifest).length} photos (${Object.entries(counts)
    .map(([k, v]) => `${v} ${k}`)
    .join(', ')}).\n\nCheck each match shows the right place. To fix one, add it to content/image-overrides.json:\n\`{ "new-york/hotels/the-mark": { "use": "File:Better photo.jpg" } }\` or \`{ "block": true }\`.\n\n${review.join('\n')}\n`,
);
console.log(`Photos: ${Object.keys(manifest).length} (${JSON.stringify(counts)})`);

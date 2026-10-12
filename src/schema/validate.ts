/**
 * Content validation. Pure functions: give them parsed JSON, get back problems.
 * `errors` fail the build; `warnings` are printed but don't block publishing.
 */
import {
  type City,
  type Entry,
  type EventsFile,
  type Evidence,
  type EvidenceKind,
  type ListFile,
  type Source,
  STALE_AFTER_DAYS,
  STATIC_CATEGORIES,
} from './types.ts';

export interface Problem {
  where: string;
  message: string;
}

export interface ValidationResult {
  errors: Problem[];
  warnings: Problem[];
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const PARTIAL_DATE = /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const KINDS: EvidenceKind[] = ['award', 'guide', 'critic', 'list', 'local-press', 'tourism', 'institution'];

export const MIN_EVIDENCE = 2;
export const MAX_EVIDENCE = 4;
export const MAX_LINE = 140;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function str(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}
function strOrNull(v: unknown): boolean {
  return v === null || str(v);
}
export function isHttpsUrl(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && u.hostname.includes('.');
  } catch {
    return false;
  }
}
export function hostMatches(url: string, domains: string[]): boolean {
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}

/** Parses YYYY, YYYY-MM or YYYY-MM-DD to a UTC date (start of the period). */
export function parsePartialDate(s: string): Date | null {
  if (!PARTIAL_DATE.test(s)) return null;
  const [y, m = '01', d = '01'] = s.split('-');
  const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  // Reject impossible dates like 2026-02-31 that JS would roll over.
  if (date.toISOString().slice(0, 10) !== `${y}-${m}-${d}`) return null;
  return date;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

export function validateCities(cities: unknown): ValidationResult {
  const errors: Problem[] = [];
  if (!Array.isArray(cities) || cities.length === 0) {
    return { errors: [{ where: 'cities.json', message: 'must be a non-empty array' }], warnings: [] };
  }
  const seen = new Set<string>();
  cities.forEach((c, i) => {
    const where = `cities.json[${i}]`;
    if (!isObj(c)) return errors.push({ where, message: 'must be an object' });
    if (!str(c.id) || !SLUG.test(c.id)) errors.push({ where, message: 'id must be a lowercase slug' });
    else if (seen.has(c.id)) errors.push({ where, message: `duplicate id "${c.id}"` });
    else seen.add(c.id);
    for (const f of ['name', 'country', 'timezone', 'tagline', 'pattern']) {
      if (!str(c[f])) errors.push({ where, message: `${f} is required` });
    }
    if (!strOrNull(c.localName)) errors.push({ where, message: 'localName must be a string or null' });
    if (c.localName && !str(c.localLang)) errors.push({ where, message: 'localLang is required when localName is set' });
    if (!str(c.accent) || !HEX.test(c.accent)) errors.push({ where, message: 'accent must be #rrggbb' });
    if (!str(c.accentInk) || !HEX.test(c.accentInk)) errors.push({ where, message: 'accentInk must be #rrggbb' });
    if (str(c.accent) && str(c.accentInk) && HEX.test(c.accent) && HEX.test(c.accentInk)) {
      const ratio = contrastRatio(c.accent, c.accentInk);
      if (ratio < 4.5) errors.push({ where, message: `accent/accentInk contrast is ${ratio.toFixed(2)}:1, needs 4.5:1` });
    }
    if (str(c.timezone)) {
      try {
        new Intl.DateTimeFormat('en', { timeZone: c.timezone });
      } catch {
        errors.push({ where, message: `unknown time zone "${c.timezone}"` });
      }
    }
  });
  return { errors, warnings: [] };
}

export function validateSources(sources: unknown): ValidationResult {
  const errors: Problem[] = [];
  if (!Array.isArray(sources)) return { errors: [{ where: 'sources.json', message: 'must be an array' }], warnings: [] };
  const ids = new Set<string>();
  const domains = new Map<string, string>();
  sources.forEach((s, i) => {
    const where = `sources.json[${i}]`;
    if (!isObj(s)) return errors.push({ where, message: 'must be an object' });
    if (!str(s.id) || !SLUG.test(s.id)) errors.push({ where, message: 'id must be a lowercase slug' });
    else if (ids.has(s.id)) errors.push({ where, message: `duplicate id "${s.id}"` });
    else ids.add(s.id);
    if (!str(s.name)) errors.push({ where, message: 'name is required' });
    if (!str(s.group)) errors.push({ where, message: 'group is required' });
    if (![1, 2, 3].includes(s.tier as number)) errors.push({ where, message: 'tier must be 1, 2 or 3' });
    if (!Array.isArray(s.domains) || s.domains.length === 0 || !s.domains.every(str)) {
      errors.push({ where, message: 'domains must be a non-empty array of strings' });
    } else {
      for (const d of s.domains as string[]) {
        const owner = domains.get(d);
        if (owner) errors.push({ where, message: `domain ${d} is already claimed by "${owner}"` });
        else domains.set(d, String(s.id));
      }
    }
  });
  return { errors, warnings: [] };
}

function validateEvidence(ev: unknown, where: string, sources: Map<string, Source>, today: Date, errors: Problem[]): void {
  if (!isObj(ev)) {
    errors.push({ where, message: 'evidence item must be an object' });
    return;
  }
  const src = str(ev.source) ? sources.get(ev.source) : undefined;
  if (!src) errors.push({ where, message: `unknown source "${String(ev.source)}" (add it to content/sources.json)` });
  if (!isHttpsUrl(ev.url)) errors.push({ where, message: 'url must be an https URL' });
  else if (src && !hostMatches(ev.url, src.domains)) {
    errors.push({ where, message: `url ${ev.url} doesn't belong to ${src.name} (${src.domains.join(', ')})` });
  }
  if (!str(ev.title)) errors.push({ where, message: 'title is required' });
  if (!KINDS.includes(ev.kind as EvidenceKind)) errors.push({ where, message: `kind must be one of ${KINDS.join(', ')}` });
  if (typeof ev.afterVisit !== 'boolean') errors.push({ where, message: 'afterVisit must be true or false' });
  if (!str(ev.supports)) errors.push({ where, message: 'supports is required (what the source says, in our words)' });
  if (ev.published !== null) {
    const d = str(ev.published) ? parsePartialDate(ev.published) : null;
    if (!d) errors.push({ where, message: 'published must be YYYY, YYYY-MM, YYYY-MM-DD or null' });
    else if (d > today) errors.push({ where, message: 'published is in the future' });
  }
  const checked = str(ev.checked) && DAY.test(ev.checked) ? parsePartialDate(ev.checked) : null;
  if (!checked) errors.push({ where, message: 'checked must be YYYY-MM-DD' });
  else if (checked > today) errors.push({ where, message: 'checked is in the future' });
}

export function validateEntry(
  e: unknown,
  where: string,
  sources: Map<string, Source>,
  today: Date,
): ValidationResult {
  const errors: Problem[] = [];
  const warnings: Problem[] = [];
  if (!isObj(e)) return { errors: [{ where, message: 'entry must be an object' }], warnings };

  if (!str(e.id) || !SLUG.test(e.id)) errors.push({ where, message: 'id must be a lowercase slug' });
  for (const f of ['name', 'subtype', 'description', 'why', 'closureCheck']) {
    if (!str(e[f])) errors.push({ where, message: `${f} is required` });
  }
  for (const f of ['description', 'why']) {
    if (str(e[f]) && (e[f] as string).length > MAX_LINE) {
      errors.push({ where, message: `${f} is ${(e[f] as string).length} characters; keep it to one line (≤ ${MAX_LINE})` });
    }
  }
  for (const f of ['localName', 'neighbourhood', 'address', 'note']) {
    if (!strOrNull(e[f])) errors.push({ where, message: `${f} must be a non-empty string or null` });
  }
  if (e.price !== null && ![0, 1, 2, 3, 4].includes(e.price as number)) {
    errors.push({ where, message: 'price must be 0–4 or null' });
  }
  if (e.website !== null && !isHttpsUrl(e.website)) errors.push({ where, message: 'website must be an https URL or null' });
  if (e.image !== null) {
    const img = e.image;
    if (!isObj(img) || !str(img.src) || !str(img.alt) || !str(img.credit) || !str(img.license) || !isHttpsUrl(img.sourceUrl)) {
      errors.push({ where, message: 'image needs src, alt, credit, license and an https sourceUrl (or set it to null)' });
    }
  }
  const lv = str(e.lastVerified) && DAY.test(e.lastVerified) ? parsePartialDate(e.lastVerified) : null;
  if (!lv) errors.push({ where, message: 'lastVerified must be YYYY-MM-DD' });
  else if (lv > today) errors.push({ where, message: 'lastVerified is in the future' });
  else if (daysBetween(lv, today) > STALE_AFTER_DAYS) {
    warnings.push({ where, message: `not verified for ${daysBetween(lv, today)} days; re-check it` });
  }

  if (!Array.isArray(e.evidence)) {
    errors.push({ where, message: 'evidence is required' });
    return { errors, warnings };
  }
  if (e.evidence.length < MIN_EVIDENCE) {
    errors.push({ where, message: `needs at least ${MIN_EVIDENCE} pieces of evidence, has ${e.evidence.length}` });
  }
  if (e.evidence.length > MAX_EVIDENCE) {
    errors.push({ where, message: `shows at most ${MAX_EVIDENCE} pieces of evidence, has ${e.evidence.length}` });
  }
  e.evidence.forEach((ev, i) => validateEvidence(ev, `${where}.evidence[${i}]`, sources, today, errors));

  const groups = new Set<string>();
  let tourism = 0;
  const urls = new Set<string>();
  for (const ev of e.evidence as Partial<Evidence>[]) {
    const src = ev.source ? sources.get(ev.source) : undefined;
    if (src) groups.add(src.group);
    if (ev.kind === 'tourism') tourism++;
    if (ev.url) {
      if (urls.has(ev.url)) errors.push({ where, message: `evidence URL listed twice: ${ev.url}` });
      urls.add(ev.url);
    }
    if (e.website && ev.url && isHttpsUrl(e.website) && isHttpsUrl(ev.url)) {
      if (new URL(ev.url).hostname.replace(/^www\./, '') === new URL(e.website).hostname.replace(/^www\./, '')) {
        errors.push({ where, message: "a place's own website can't be evidence for it" });
      }
    }
  }
  if (groups.size < MIN_EVIDENCE) {
    errors.push({ where, message: `needs ${MIN_EVIDENCE} independent publishers, has ${groups.size}` });
  }
  if (tourism > 1) errors.push({ where, message: 'at most one tourism-board source per entry' });
  return { errors, warnings };
}

export function validateList(
  list: unknown,
  file: string,
  cityIds: Set<string>,
  sources: Map<string, Source>,
  today: Date,
): ValidationResult {
  const errors: Problem[] = [];
  const warnings: Problem[] = [];
  if (!isObj(list)) return { errors: [{ where: file, message: 'must be an object' }], warnings };
  if (!str(list.city) || !cityIds.has(list.city)) errors.push({ where: file, message: `unknown city "${String(list.city)}"` });
  if (!STATIC_CATEGORIES.includes(list.category as never)) {
    errors.push({ where: file, message: `category must be one of ${STATIC_CATEGORIES.join(', ')}` });
  }
  const expected = `${String(list.city)}/${String(list.category)}.json`;
  if (!file.replace(/\\/g, '/').endsWith(expected)) {
    errors.push({ where: file, message: `file should be named lists/${expected}` });
  }
  if (list.status !== 'researched' && list.status !== 'researching') {
    errors.push({ where: file, message: 'status must be "researched" or "researching"' });
  }
  if (!str(list.updated) || !DAY.test(list.updated)) errors.push({ where: file, message: 'updated must be YYYY-MM-DD' });
  if (!Array.isArray(list.entries)) {
    errors.push({ where: file, message: 'entries must be an array' });
    return { errors, warnings };
  }
  const ids = new Set<string>();
  const names = new Set<string>();
  list.entries.forEach((e, i) => {
    const where = `${file} › ${isObj(e) && str(e.name) ? e.name : `entries[${i}]`}`;
    const r = validateEntry(e, where, sources, today);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
    if (isObj(e) && str(e.id)) {
      if (ids.has(e.id)) errors.push({ where, message: `duplicate id "${e.id}"` });
      ids.add(e.id);
    }
    if (isObj(e) && str(e.name)) {
      const key = e.name.toLowerCase();
      if (names.has(key)) errors.push({ where, message: `"${e.name}" appears twice in this list` });
      names.add(key);
    }
  });
  return { errors, warnings };
}

export function validateEvents(file: unknown, where: string, cityIds: Set<string>): ValidationResult {
  const errors: Problem[] = [];
  if (!isObj(file)) return { errors: [{ where, message: 'must be an object' }], warnings: [] };
  if (!str(file.city) || !cityIds.has(file.city)) errors.push({ where, message: `unknown city "${String(file.city)}"` });
  if (!Array.isArray(file.events)) errors.push({ where, message: 'events must be an array' });
  else {
    (file.events as unknown[]).forEach((ev, i) => {
      const w = `${where}.events[${i}]`;
      if (!isObj(ev)) return errors.push({ where: w, message: 'must be an object' });
      for (const f of ['id', 'name', 'venue']) if (!str(ev[f])) errors.push({ where: w, message: `${f} is required` });
      if (!isHttpsUrl(ev.url)) errors.push({ where: w, message: 'url must be https (events always link to the official page)' });
      if (!str(ev.startsAt) || !/[+-]\d{2}:\d{2}$|Z$/.test(ev.startsAt) || Number.isNaN(Date.parse(ev.startsAt))) {
        errors.push({ where: w, message: 'startsAt must be ISO 8601 with a UTC offset' });
      }
    });
    if ((file.events as unknown[]).length > 0 && !str(file.sourceName)) {
      errors.push({ where, message: 'events need a sourceName for attribution' });
    }
  }
  return { errors, warnings: [] };
}

// --- colour contrast (WCAG 2.2) -------------------------------------------

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

export type { City, Entry, EventsFile, ListFile, Source };

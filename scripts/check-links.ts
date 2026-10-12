/**
 * Link and freshness check. Run weekly in CI (and any time with `npm run check-links`).
 *
 * - Every evidence URL and official website is requested (HEAD, falling back to GET).
 * - Entries not re-verified within STALE_AFTER_DAYS are listed as stale.
 * - Writes a Markdown report to link-report.md and exits non-zero if any link is
 *   definitely broken (404/410/DNS failure), so the weekly job shows red and opens an issue.
 *
 * Many publishers block automated requests (403/429). Those are reported as
 * "couldn't check" rather than broken: a human should look, not a script.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { STALE_AFTER_DAYS, type ListFile } from '../src/schema/types.ts';
import { daysBetween, parsePartialDate } from '../src/schema/validate.ts';
import { today } from '../src/lib/today.ts';

const root = join(import.meta.dirname, '..');
const listsDir = join(root, 'content/lists');

interface Target {
  url: string;
  where: string;
}
const targets: Target[] = [];
const stale: string[] = [];
const now = today();

for (const city of readdirSync(listsDir)) {
  for (const f of readdirSync(join(listsDir, city))) {
    const list: ListFile = JSON.parse(readFileSync(join(listsDir, city, f), 'utf8'));
    for (const e of list.entries) {
      const where = `${city}/${list.category}/${e.id}`;
      if (e.website) targets.push({ url: e.website, where: `${where} (website)` });
      for (const ev of e.evidence) targets.push({ url: ev.url, where: `${where} (evidence: ${ev.source})` });
      const lv = parsePartialDate(e.lastVerified);
      if (lv && daysBetween(lv, now) > STALE_AFTER_DAYS) stale.push(`${where}: last verified ${e.lastVerified}`);
    }
  }
}

type Outcome = { kind: 'ok' } | { kind: 'broken'; detail: string } | { kind: 'unknown'; detail: string };

async function check(url: string): Promise<Outcome> {
  const opts = { redirect: 'follow' as const, signal: AbortSignal.timeout(15_000), headers: { 'user-agent': 'Mozilla/5.0 (compatible; RecloLinkCheck/1.0; +https://github.com/nweinberg97/Reclo)' } };
  try {
    let res = await fetch(url, { ...opts, method: 'HEAD' });
    if (res.status === 405 || res.status === 403 || res.status === 400) res = await fetch(url, { ...opts, method: 'GET' });
    if (res.ok) return { kind: 'ok' };
    if (res.status === 404 || res.status === 410) return { kind: 'broken', detail: `HTTP ${res.status}` };
    return { kind: 'unknown', detail: `HTTP ${res.status}` };
  } catch (err) {
    const msg = (err as Error & { cause?: { code?: string } }).cause?.code ?? (err as Error).message;
    if (msg === 'ENOTFOUND') return { kind: 'broken', detail: 'domain not found' };
    return { kind: 'unknown', detail: msg };
  }
}

const unique = [...new Map(targets.map((t) => [t.url, t])).values()];
const results = new Map<string, Outcome>();
const CONCURRENCY = 8;
let i = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (i < unique.length) {
      const t = unique[i++]!;
      results.set(t.url, await check(t.url));
    }
  }),
);

const broken = targets.filter((t) => results.get(t.url)?.kind === 'broken');
const unknown = targets.filter((t) => results.get(t.url)?.kind === 'unknown');
const lines = [
  `# Reclo link report — ${now.toISOString().slice(0, 10)}`,
  '',
  `Checked ${unique.length} unique links across ${targets.length} references.`,
  '',
  `## Broken (${broken.length})`,
  ...broken.map((t) => `- ${t.where}: ${t.url} — ${(results.get(t.url) as { detail: string }).detail}`),
  '',
  `## Couldn't check automatically (${unknown.length})`,
  ...unknown.map((t) => `- ${t.where}: ${t.url} — ${(results.get(t.url) as { detail: string }).detail}`),
  '',
  `## Stale: not verified in ${STALE_AFTER_DAYS} days (${stale.length})`,
  ...stale.map((s) => `- ${s}`),
  '',
];
writeFileSync(join(root, 'link-report.md'), lines.join('\n'));
console.log(lines.slice(0, 3).join('\n'));
console.log(`Broken: ${broken.length} · Couldn't check: ${unknown.length} · Stale: ${stale.length} (see link-report.md)`);
if (broken.length > 0 || stale.length > 0) process.exit(1);

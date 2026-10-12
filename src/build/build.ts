/**
 * Builds the whole site into dist/: every city, list and pick as a real,
 * pre-rendered page with its own URL, plus the search index, sitemap, link
 * previews and share cards. Fails loudly if any content is invalid.
 *
 *   npm run build              full build, including share images (needs Chromium)
 *   npm run build:fast         pages only, for quick iteration
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { build as esbuild } from 'esbuild';
import type { Html } from '#jsx/jsx-runtime';
import { ContentError, loadContent, listKey } from '../lib/content.ts';
import { today } from '../lib/today.ts';
import { STATIC_CATEGORIES } from '../schema/types.ts';
import { makeDoc, type SearchDoc } from '../search/search.ts';
import { setAssetVersion } from '../site/assets.ts';
import { SITE, absolute } from '../site/config.ts';
import { CATEGORY_COPY } from '../site/copy.ts';
import { routes } from '../site/routes.ts';
import { CityPage, EventsPage, HomePage, ListPage, PickPage, totalPicks } from '../site/pages/pages.tsx';
import { NotFoundPage, PrivacyPage, RanksPage, SearchPage } from '../site/pages/static.tsx';
import { type CardJob, type CardPhoto, appIcon, cityOg, homeOg, listOg, pickCards, textOg } from './cards.tsx';
import { photoKey } from '../lib/photos.ts';
import { renderCards } from './render-cards.ts';

const root = join(import.meta.dirname, '..', '..');
const dist = join(root, 'dist');
const started = Date.now();

// 1. Content: validate and rank. Any problem stops the build.
let content;
try {
  content = loadContent(join(root, 'content'), today());
} catch (err) {
  if (err instanceof ContentError) {
    console.error(`\n✗ Build stopped: ${err.message}\n`);
    process.exit(1);
  }
  throw err;
}
for (const w of content.warnings) console.warn(`  ! ${w.where}: ${w.message}`);

// Events that have already finished never get published.
const now = Date.now();
for (const file of content.events.values()) {
  file.events = file.events.filter((e) => Date.parse(e.endsAt ?? e.startsAt) + (e.endsAt ? 0 : 3 * 3600_000) > now);
}

// 2. Fresh output folder with static files.
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'assets'), { recursive: true });
cpSync(join(root, 'public'), dist, { recursive: true });
writeFileSync(join(dist, '.nojekyll'), '');
// Photos (see scripts/fetch-images.ts) are served from /img.
if (existsSync(join(root, 'content/images'))) {
  cpSync(join(root, 'content/images'), join(dist, 'img'), { recursive: true, filter: (src) => !/\.(md|json)$/.test(src) });
}

// 3. Client script and stylesheet, with a content hash for caching.
const js = await esbuild({
  entryPoints: [join(root, 'src/site/client/main.ts')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020', 'safari15'],
  write: false,
  legalComments: 'none',
});
const jsText = js.outputFiles[0]!.text;
const cssText = readFileSync(join(root, 'src/site/styles/reclo.css'), 'utf8');
writeFileSync(join(dist, 'assets/reclo.js'), jsText);
writeFileSync(join(dist, 'assets/reclo.css'), cssText);
setAssetVersion(createHash('sha256').update(jsText).update(cssText).digest('hex').slice(0, 10));

// 4. Pages.
let pageCount = 0;
function write(path: string, html: Html): void {
  const file = path.endsWith('.html') ? join(dist, path) : join(dist, path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html.value);
  pageCount++;
}

const sitemap: string[] = [];
const index: SearchDoc[] = [];
const cards: CardJob[] = [];
const fontsBase = `file://${join(dist, 'fonts')}/`;
const cardPhoto = (key: string): CardPhoto | null => {
  const ph = content.photos.get(key);
  if (!ph) return null;
  return { src: `file://${join(root, 'content/images', ph.file)}`, credit: `Photo: ${ph.credit}${ph.license ? `, ${ph.license}` : ''}` };
};
const sourceNames = new Map([...content.sources.values()].map((s) => [s.id, s.name]));

write(routes.home(), HomePage({ content }));
sitemap.push(routes.home());
write(routes.search(), SearchPage());
write(routes.ranks(), RanksPage({ content }));
write(routes.privacy(), PrivacyPage());
write('404.html', NotFoundPage());
sitemap.push(routes.ranks(), routes.privacy());
cards.push(homeOg(content.cities, fontsBase, routes.ogHome()));
cards.push(textOg('How Reclo ranks', 'Evidence, not ads. Here’s exactly how a place gets in, and why nobody can pay to move up.', fontsBase, routes.ogPage(routes.ranks())));
cards.push(appIcon(fontsBase, 'apple-touch-icon.png'));

for (const city of content.cities) {
  const total = totalPicks(content, city);
  write(routes.city(city.id), CityPage({ content, city }));
  sitemap.push(routes.city(city.id));
  cards.push(cityOg(city, total, fontsBase, routes.ogPage(routes.city(city.id)), cardPhoto(photoKey.city(city.id))));
  index.push(
    makeDoc({
      t: 'city',
      u: routes.city(city.id),
      n: city.localName ? `${city.name} (${city.localName})` : city.name,
      s: total ? `${city.country}, ${total} picks` : `${city.country}, being researched`,
      names: [city.name, city.localName, city.id.replace(/-/g, ' ')],
      keywords: [city.country],
      a: city.accent,
      empty: total === 0,
    }),
  );

  for (const cat of STATIC_CATEGORIES) {
    const list = content.lists.get(listKey(city.id, cat))!;
    const copy = CATEGORY_COPY[cat];
    write(routes.list(city.id, cat), ListPage({ content, list }));
    sitemap.push(routes.list(city.id, cat));
    cards.push(listOg(city, cat, list.picks.map((p) => p.entry.name), list.picks.length, fontsBase, routes.ogPage(routes.list(city.id, cat))));
    index.push(
      makeDoc({
        t: 'list',
        u: routes.list(city.id, cat),
        n: `${copy.label} in ${city.name}`,
        s: list.picks.length ? `${list.picks.length} picks` : 'Being researched',
        names: [city.name, city.localName],
        keywords: [copy.keywords, copy.label],
        a: city.accent,
        empty: list.picks.length === 0,
      }),
    );

    list.picks.forEach((p, i) => {
      const e = p.entry;
      const path = routes.pick(city.id, cat, e.id);
      write(path, PickPage({ content, list, p, prev: list.picks[i - 1] ?? null, next: list.picks[i + 1] ?? null }));
      sitemap.push(path);
      cards.push(
        ...pickCards({
          city,
          category: cat,
          p,
          total: list.picks.length,
          sourceNames,
          fontsBase,
          photo: cardPhoto(photoKey.pick(city.id, cat, e.id)),
          paths: {
            og: routes.ogPage(path),
            story: routes.card(city.id, cat, e.id, 'story'),
            post: routes.card(city.id, cat, e.id, 'post'),
            badge: routes.card(city.id, cat, e.id, 'badge'),
          },
        }),
      );
      index.push(
        makeDoc({
          t: 'pick',
          u: path,
          n: e.localName ? `${e.name} (${e.localName})` : e.name,
          s: `#${p.rank} ${copy.singular} in ${city.name}${e.neighbourhood ? `, ${e.neighbourhood}` : ''}`,
          names: [e.name, e.localName],
          keywords: [e.neighbourhood, e.subtype, city.name, city.localName, copy.singular, cat === 'hotels' ? 'hotel stay' : cat === 'restaurants' ? 'restaurant food eat' : 'things to do see'],
          r: p.rank,
          a: city.accent,
        }),
      );
    });
  }

  write(routes.list(city.id, 'events'), EventsPage({ content, city }));
  sitemap.push(routes.list(city.id, 'events'));
  const events = content.events.get(city.id)!.events;
  cards.push(listOg(city, 'events', events.map((e) => e.name), events.length, fontsBase, routes.ogPage(routes.list(city.id, 'events'))));
  index.push(
    makeDoc({
      t: 'list',
      u: routes.list(city.id, 'events'),
      n: `This week in ${city.name}`,
      s: events.length ? `${events.length} events` : 'Coming soon',
      names: [city.name, city.localName],
      keywords: [CATEGORY_COPY.events.keywords],
      a: city.accent,
      empty: events.length === 0,
    }),
  );
}

// 5. Search index, sitemap, robots.
writeFileSync(join(dist, 'search-index.json'), JSON.stringify(index));
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap
    .map((p) => `  <url><loc>${absolute(p)}</loc></url>`)
    .join('\n')}\n</urlset>\n`,
);
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${absolute('sitemap.xml')}\n`);

console.log(`✓ ${pageCount} pages, ${index.length} search entries → dist/ (${SITE.url})`);

// 6. Link previews and share cards.
if (process.env.RECLO_SKIP_CARDS) {
  console.log('  (skipped share images: RECLO_SKIP_CARDS is set)');
} else {
  await renderCards(cards, dist);
}
if (!existsSync(join(dist, 'index.html'))) throw new Error('Build produced no home page');
console.log(`✓ Done in ${((Date.now() - started) / 1000).toFixed(1)}s`);

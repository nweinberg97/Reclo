# Reclo

**The best of every city, with the receipts.**

Reclo is a free, searchable notebook of the best places to eat, stay and go in the world's great cities. Every pick is backed by at least two independent sources, linked and dated. Nobody can pay to be listed. No accounts, no cookies, no tracking.

- Live site: https://nweinberg97.github.io/Reclo/ (once GitHub Pages is enabled, see Deploy)
- How ranking works: `/how-reclo-ranks/` on the site, and `src/ranking/rank.ts`
- Design: [`DESIGN.md`](DESIGN.md) · Decisions: [`DECISIONS.md`](DECISIONS.md) · Review notes: [`NOTES.md`](NOTES.md)

## What's in version 1

| City | Restaurants & cafés | Hotels | Things to do | This week |
|---|---|---|---|---|
| Vancouver | 25 | 13 | 24 | awaiting trusted calendars |
| Toronto | 25 | 20 | 25 | awaiting trusted calendars |
| New York | 25 | 25 | 25 | awaiting trusted calendars |
| London, Paris, Tokyo, Barcelona, Lisbon, Mexico City, Seoul | being researched | being researched | being researched | awaiting trusted calendars |

207 published picks, all verified against at least two independent publishers on 11 Oct 2026, plus 20 verified backups. 85 places were researched and rejected (closed, closing, or not enough independent evidence); they're listed with reasons in `research/raw/`.

## Run it

Requires Node 22+.

```bash
npm install
npx playwright install chromium   # for share images and end-to-end tests
npm run build                      # validate, rank, render pages + share images into dist/
npm run preview                    # http://localhost:4321/Reclo/
```

`npm run build:fast` skips share images for quick iteration.

| Command | What it does |
|---|---|
| `npm run validate` | Checks all content; `-- --verbose` prints every ranked list with scores |
| `npm test` | Unit tests: validation, ranking, hype filter, search, events, time zones |
| `npm run test:e2e` | Journeys on phone and desktop (run after `npm run build`) |
| `npm run typecheck` | TypeScript |
| `npm run check-links` | Checks every source link and website, flags entries not verified in 6 months; writes `link-report.md` |
| `npm run events` | Refreshes "This week" from the calendar feeds in `content/event-feeds.json` |
| `npm run import -- research/raw/<city>-<category>.json` | Turns a research file into a published list |
| `npm run images` | Finds and saves photos (runs in the Photos workflow; needs internet) |

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`: refresh events → typecheck → unit tests → build (fails on any invalid or under-evidenced entry) → end-to-end tests → publish to GitHub Pages. It also runs daily so events stay current and past ones disappear.

One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**. To serve from a custom domain, set `RECLO_SITE_URL` in the workflow.

`.github/workflows/links.yml` runs every Monday and opens an issue if any link breaks or an entry goes stale.

## Add a city or grow a list (no code changes)

1. Give a researcher `research/RESEARCH_BRIEF.md` and a city + category. They write `research/raw/<city>-<category>.json`.
2. Add any new publishers to `content/sources.json` with a tier and ownership group.
3. `npm run import -- research/raw/<city>-<category>.json`
4. `npm run validate -- --verbose`, read the ranked list, then commit. The build refuses anything that doesn't meet the rules.

To add events for a city, add trusted iCalendar feeds to `content/event-feeds.json`:

```json
{ "vancouver": [{ "name": "Example Hall", "ics": "https://…/events.ics", "website": "https://…/events", "kind": "Concert", "venue": null }] }
```

## How it's built

A small static site generator in TypeScript. JSX templates render to plain HTML at build time (`src/jsx`), so every city, list and pick is a real page with its own URL, canonical tag, structured data and designed link preview. The browser gets about 7 KB of JavaScript (search, sharing, theme), a stylesheet and self-hosted fonts.

```
content/        the data (cities, publishers, lists, events). Licensed separately from code.
research/       the research brief and raw research, including rejected places
src/schema      types and validation       src/ranking   the ranking method
src/search      the search index + query   src/events    iCalendar reader
src/site        pages, styles, copy deck, illustration, client script
src/build       the build and share-image renderer
scripts/        validate, import, check links, fetch events, preview server
tests/          unit tests and end-to-end journeys
```

## Licence

**Content** (`content/`, `research/`): All rights reserved, licence to be decided.
**Code** (everything else): All rights reserved, licence to be decided.
They're kept in separate folders so either can be licensed later. Fonts are Inter and Lora under the SIL Open Font License (`public/fonts/LICENSE.txt`).

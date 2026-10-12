# Reclo: design

> The best of every city, with the receipts.

Reclo is a free, searchable notebook of the best places to eat, stay and go in ten cities. Every pick shows the independent evidence behind it. Nobody can pay to be in it. This document is the design brief we built against; `DECISIONS.md` records the individual calls.

## 1. The metaphor: a shelf of field notebooks

**Each city is its own notebook, and the landing page is the shelf.** We chose notebooks over chapters of one book because Reclo is shared city by city ("here's the Lisbon one"), each city needs its own cover and personality, and a shelf makes the honest state of things visible at a glance: finished notebooks are full colour with a pick count; unfinished ones are faded and labelled *Being researched*.

Inside a notebook:

| Object | On screen |
|---|---|
| Cover | City colour, a pattern that nods to the place, the city name in its local script too, one line in Reclo's voice |
| Dividers | Category tabs that stick up out of the page: Restaurants & cafés, Hotels, Things to do, This week |
| Pages | Ranked lists on dotted notebook paper |
| Highlighter | The rank numeral sits on a yellow highlighter swipe, slightly hand-tilted |
| Rubber stamp | "Checked" + date, stamped on every pick. Trust as a designed object |
| Receipts | The evidence, shown as the receipts a friend keeps |

It's a field notebook rather than a leather travel journal: dotted pages, blue-black fountain-pen ink, a highlighter. That keeps it warm and handmade without the cream-and-terracotta look every "journal" app has.

## 2. The journey, frame by frame

1. **Hears about it.** A friend drops a link in the group chat. The preview shows *#1 place to eat in Vancouver / Kissa Tanto*, the why-line, and *With the receipts: Michelin Guide · Canada's 100 Best…*. You trust it before you tap.
2. **Lands on a pick** (most first visits). The rank, the name, why it's here, the receipts with dates, the stamp. Breadcrumbs and tabs make the rest of the notebook one tap away.
3. **Or lands on the home page.** One line, one sentence, one search box, one shelf. Tap a notebook.
4. **Opens a city.** The cover, then the first page of every tab: the top three of each list.
5. **Browses a list.** Big ranks, names, a one-line why in an italic "friend's voice", and "4 sources, checked 11 Oct 2026" on every row.
6. **Opens a pick.** The rank number travels from the row into the page (a cross-document view transition), the stamp lands, the receipts are there.
7. **Shares.** One button. On phones, the native share sheet; elsewhere, the link is copied with a toast. Story and post cards download in one tap.
8. **Goes.** Website, address (opens a map), price, last checked. Hotels book directly with the hotel. Reclo never takes payments.
9. **Is the place.** A "Made the list?" card, like a Michelin plaque: share-ready, unbuyable.

## 3. The 11-star exercise

For each key moment, what 1, 5, 7, 9 and 11 stars look like, and where version 1 lands. We aimed for 7 to 8 everywhere and refused anything that cost trust.

| Moment | 1★ | 5★ | 7★ (v1) | 9★ | 11★ |
|---|---|---|---|---|---|
| **Landing** | A directory and a cookie banner | Clean page, clear promise | One line, one shelf of colourful notebooks that slide in, search ready, no banner because there are no cookies | It already knows you're travelling to Lisbon next week (without tracking you) | The city's friends send you their notebook before you ask |
| **Opening a city** | A table of results | A nice header and lists | A cover with the city's colour and pattern, local-script name, tabs as dividers, the first page of every list | A local's voice note on the cover | You feel like a regular before you land |
| **Browsing a list** | Infinite scroll with ads | A ranked list with ratings | Scoreboard ranks on highlighter, one-line why, sources count and check date on every row; shorter lists say so honestly | Filters by mood and neighbourhood | The list adapts to the day: rain, holidays, what's open now |
| **Viewing a pick** | A stock photo and a star rating | Description and website | Why it's here, the receipts (who, what they said in our words, when), a checked stamp, practical info, prev/next | Licensed photography for every pick | The owner's note on what to order |
| **Searching** | No results for "cafe" | Server search with typos punished | Instant, offline, accent- and typo-tolerant, local scripts work, keyboard friendly, a helpful empty state | Natural language: "quiet breakfast near my hotel" | Search answers before you finish typing, and it's right |
| **Sharing** | Copy the URL | A share button | Native share sheet, designed link previews for every page, 9:16 and 1:1 cards, a "Made the list" card | Group lists for trips (without accounts) | Friends plan the trip inside Reclo's links |

What we said no to for v1: accounts, saving, maps, filters, user reviews, photos we can't license, ads, newsletters, pop-ups.

## 4. Brand system

**Palette.** Paper `#F6F7F3` with a dotted grid, ink `#1B2A4A` (blue-black), soft ink `#4A5672`, rule `#D5DBE6`, highlighter `#FFE45C`, stamp red `#B93228`. Dark mode is night-blue paper `#111A2C` with the same ink logic inverted. Every city adds one cover colour, chosen to clear 4.5:1 against its cover text (the build checks this).

| City | Cover | Pattern | Why |
|---|---|---|---|
| Vancouver | Cedar green `#1E5E52` | Waves | Sea and ridge line |
| Toronto | Streetcar red `#A8382B` | Diagonal tracks | The TTC |
| New York | Taxi yellow `#F2C230` | Street grid | Manhattan's grid |
| London | Underground blue `#1F3F8F` | Roundels | The Tube |
| Paris | Lilac zinc `#5A4A8C` | Arches | Haussmann façades |
| Tokyo | Sakura `#C2255C` | Blossoms | Cherry blossom |
| Barcelona | Ochre `#E8963A` | Suns | Mediterranean light |
| Lisbon | Azulejo blue `#2A62B0` | Tiles | Azulejos |
| Mexico City | Rosa mexicano `#C4146F` | Papel picado | Festival bunting |
| Seoul | Celadon `#1F7468` | Stepped blocks | Dancheong |

**Type.** Two families, self-hosted. *Inter Display Black* for ranks and city names (scoreboard confidence, tabular figures). *Inter* for interface text. *Lora Italic* is the friend's voice: every "why it's here", tagline and receipt summary. Local names use the system's CJK fonts with the right `lang` so they're pronounced and shaped correctly.

**Illustration.** Drawn in code: one pattern per city, one line glyph per category (cup, key, compass, calendar), a rubber stamp. Picks without a licensed photo get a designed "page from the notebook" (cover colour + pattern + category glyph), never a scraped photo.

**Motion.** One orchestrated moment per screen and only where it explains something: notebooks slide onto the shelf on first load; tabs lift; the rank number travels from list to pick (view transitions); the stamp lands on a pick. Springy, short, and all of it switched off for `prefers-reduced-motion`.

## 5. Voice and copy deck

Warm, plain, specific. Talk like a well-travelled friend, never like an ad. No exclamation marks, no "hidden gem", no "must-try". Honest about what we don't know. The full deck lives in `src/site/copy.ts`; the core lines:

| Where | Copy |
|---|---|
| Promise | The best of every city, with the receipts. |
| Intro | A free notebook of where to eat, stay and go in ten cities. Every pick shows the independent evidence behind it, and nobody can pay to be here. |
| Promises | Every pick shows its receipts · Nothing here is for sale · Nothing about you is collected |
| Pride line | #1 place to eat in Vancouver · #4 hotel in Toronto · #2 thing to do in New York |
| Unfinished list | This page is still being researched. We'd rather leave it blank than guess. |
| Short list | 13 verified so far. We only publish what we can back up, so this list grows as we check more places. |
| Events, no source | This week's page is still blank. We're choosing calendars we trust for this city. Until then, you'll find nothing here rather than something made up. |
| No results | Nothing in the notebook for "x" yet. Try a city, a neighbourhood or a kind of place, like "ramen" or "museum". |
| Made the list | If this is your place, congratulations. Here's a card to share. You didn't pay for it and nobody else can either. |
| Footer | No ads. No paid placement. No tracking. |
| Errors | Spot something wrong or missing? Tell us |

## 6. Data schema

Content lives in `content/`, separate from code, and is validated on every build (`src/schema/types.ts`, `src/schema/validate.ts`).

```
content/
  cities.json                 10 cities: name, local name + language, time zone, cover colour, pattern, tagline
  sources.json                every publisher we cite: domains, tier (1–3), ownership group
  lists/<city>/<category>.json  one file per list: status, updated, entries[]
  event-feeds.json            calendar feeds per city (empty until we choose trusted ones)
  events/<city>.json          generated daily from the feeds
research/                     the research brief and raw research, including what we rejected and why
```

An **entry**: `id`, `name`, `localName`, `neighbourhood`, `subtype`, `description`, `why`, `price` (0 free, 1–4), `website`, `address`, `image` (licensed only, with credit), `note` (honest caveats such as seasonal opening), `evidence[]`, `lastVerified`, `closureCheck`.

A piece of **evidence**: `source` (publisher id), `url`, `title`, `kind` (award, critic, guide, list, local-press, tourism, institution), `published`, `afterVisit`, `supports` (what it says, in our words), `checked`.

The build fails if an entry has fewer than two pieces of evidence from independent owners, cites an unknown publisher, cites a URL that doesn't belong to the credited publisher, uses the place's own site as evidence, has more than one tourism-board source, or is missing a required field. Ranks are never stored: they're computed (`src/ranking/rank.ts`) so the method and the result can't drift apart. Lists show the top `LIST_SIZE` (25); raising it toward 100 needs no other change.

## 7. Technical shape

Static-first, no runtime server. TypeScript + JSX rendered at build time into plain HTML (no client framework), about 7 KB of JavaScript (3 KB compressed) for search, sharing and the theme switch. Every city, list and pick is a real page with its own URL, canonical tag, structured data and designed preview. Search is a prebuilt index queried in the browser. Share images are rendered from the same tokens with headless Chromium. Deployed to GitHub Pages by a workflow that also refreshes events daily. See `README.md`.

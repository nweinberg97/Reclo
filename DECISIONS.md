# Decisions

One line of reasoning per call. Newest at the bottom of each section.

## Product

- **Each city is a notebook; the home page is the shelf.** Cities are shared one at a time and each needs its own cover; a shelf shows finished and unfinished notebooks honestly at a glance.
- **Cities first on the shelf if finished.** A visitor's first tap should land on something full, not a blank page; unfinished notebooks stay visible and honest.
- **Field notebook, not leather journal.** Dotted paper, fountain-pen ink and a highlighter feel handmade without the cream-and-clay look every "journal" design uses.
- **The rank sits on a highlighter swipe.** It's the one bold element: what a friend does to the best thing in their notebook, and it reads as a scoreboard at a glance.
- **A "Checked" rubber stamp on every pick.** Trust needs to be seen, not claimed; a dated stamp is the most physical way to say "we looked".
- **"The receipts" for evidence.** Plain, a little playful, and exactly what it is.
- **Pride line format: "#1 place to eat in Vancouver".** Ranks are within a list, so "#3 café" would be untrue when #3 is a restaurant; "place to eat" is honest and still brag-worthy.
- **City page shows the top three of every list.** Fastest path from a shared city link to something useful, with one tap to the full list.
- **List shows top 25; verified extras are kept as backups.** The brief's list size, and backups let the list re-balance or replace a closure without new research.
- **Short lists ship short, with a note.** Vancouver hotels has 13 and Toronto hotels 20 because that's what we could verify; padding would break the one promise that matters.
- **Unfinished cities are browsable but empty, with the honest message and links to finished notebooks.** Better than hiding them: people can see what's coming and that we don't guess.
- **No photos in v1; every pick gets a designed "page from the notebook".** We couldn't reach Wikimedia Commons from the build environment to verify licences per file; the schema already supports licensed images with credits, so photos can be added entry by entry without code changes.
- **"Tell us" goes to a pre-filled GitHub issue.** A simple, public, external form with no inbox to run; swap `RECLO_FEEDBACK_URL` for a mailto or form when there's an address to publish.
- **Maps link to OpenStreetMap search, not an embedded map.** No third-party scripts or tracking on our pages, and the address is one tap from directions.
- **Hotels and events always link out to the official site.** Reclo never takes payments in v1 and never sits between a guest and a hotel.

## Data and trust

- **Research by brief, not by scraping.** Researchers follow `research/RESEARCH_BRIEF.md`: only real places, at least two independent sources actually opened, closure checks, our own words, no copied rankings.
- **Independence is by owner, not by website.** Publishers have a `group` (e.g. Lonely Planet and The Points Guy are both Red Ventures; CP24 and CTV are both Bell Media) and count once.
- **A place's own website, booking sites and aggregators never count as evidence.** They can't be independent of the place or of who pays.
- **Evidence URLs must belong to the credited publisher.** Catches typos and misattribution at build time.
- **Tiers are a published human judgement.** The tier table is on /how-reclo-ranks so anyone can see and argue with it.
- **Undated evergreen guide pages count 90%.** Treating them as old (our first draft) let a fresher minor listing outrank The Met; undated isn't the same as stale.
- **Variety penalty starts after the third of a kind.** Our first draft penalised from the second museum, which pushed MoMA to #25 in New York; three of any style are free, then each further one needs ~12% more evidence.
- **Ties break by number of independent sources, then freshness, then name.** Deterministic and explainable.
- **Ranks are computed at build time, never stored.** The method and the published order can't drift apart.
- **Excluded before launch:** The Wall Street Hotel (official domain now for sale), Richmond Night Market (seasonal and outside the city), Harbourfront Centre (main building closed this month), Rogers Centre (season over), Statue of Liberty (only one independent source we could open after removing the park service's own page). Each is recorded in this file so it can be revisited.
- **Smorgasburg carries a seasonal note.** It's real and great, but closed half the year; the note says so.
- **Kept with a watchful eye:** Dynasty Seafood (Vancouver) has strong 2026 awards but left the Michelin guide in October and its building faces redevelopment; no closure news. It's re-checked first when the link checker runs.
- **Raw research is committed (`research/raw/`).** Including rejected places and why; open history is part of honest ratings.
- **Stale after six months.** The link checker flags any entry not re-verified within 183 days.

## Events

- **No Ticketmaster (owner's call); no single ticketing company at all.** Events come from iCalendar (.ics) feeds that trusted organisations already publish, listed per city in `content/event-feeds.json`. No API keys, no affiliate links, and choosing the feeds is where quality judgement lives.
- **No feeds chosen yet, so every Events tab shows an honest empty state.** We'd rather show nothing than fill the tab with popularity-ranked listings we haven't vetted.
- **Past events disappear twice:** the daily build drops them, and the page hides anything that ended since the last build.
- **Times are shown in the city's local time** using the offset stored with each event, so a Vancouver visitor reading the Seoul page sees Seoul times.

## Technology

- **A tiny static site generator in TypeScript instead of React + Vite.** Every page must be pre-rendered HTML with its own URL; JSX gives typed templates, but shipping React to the browser would add ~45 KB for nothing. Our JSX runtime renders to escaped HTML strings at build time (`src/jsx`).
- **About 7 KB of client JavaScript (3 KB compressed), total.** Only search, sharing, the theme switch and event expiry need it; everything else works without JavaScript.
- **Our own search instead of MiniSearch or Pagefind.** A ~150-line index we fully control: accent-insensitive ("cafe" → café), prefix type-ahead, one-typo tolerance, CJK and Hangul substring matching, and the same code is unit-tested and shipped.
- **Self-hosted Inter and Lora, subset to Latin.** No requests to Google Fonts (privacy) and about 120 KB of fonts, cached after the first page; CJK falls back to the device's own fonts rather than shipping megabytes.
- **Share images rendered with headless Chromium at build time.** They use the same fonts, colours and illustrations as the site, so every share looks like Reclo; 4 per pick (preview, story, post, made-the-list).
- **Cross-document view transitions for the list → pick moment.** A progressive enhancement: delightful where supported, invisible where not, off for reduced motion.
- **Theme follows the system; a toggle overrides it, saved in the browser only.** It's a preference, not data about the person, and never leaves the device.
- **No analytics.** Nothing to justify, nothing to leak. We'll learn from "Tell us" notes and, later, privacy-friendly aggregate counts only if a real question needs them.
- **GitHub Pages via Actions, rebuilt daily.** Free, static, and the daily run refreshes events and removes past ones.
- **`npm install` without a lockfile, for now.** The build environment that made v1 had no access to the npm registry, so a lockfile couldn't be generated honestly; commit the one CI creates on first run.
- **Code and content in separate folders, both "all rights reserved, licence to be decided".** Either can be licensed later without untangling the other.

## Redesign: photo-led and vibrant (v1.1, owner feedback)

- **"Guide", not "notebook".** The notebook described the feel, not the thing; each city is now a guide ("Pick a city", "The Vancouver guide").
- **Photography leads every screen.** Full-bleed city photos on the home page and city pages, a photo on every place card and pick, Airbnb-style swipeable rails.
- **Where photos come from:** first a freely licensed Wikimedia Commons photo via the place's Wikidata entry (credited to the photographer, with licence). Otherwise, the place's own share image (the og:image its site publishes for link previews), credited to the site and linked back, with a "remove this photo" link on the pick. The owner chose to accept that a website photo is the business's copyright and shown without explicit permission; the takedown path and `content/image-optout.json` are the safeguard.
- **Photos are fetched by a GitHub Action, checked, and committed.** Self-hosted for speed and privacy (no visitor requests to other sites). Matches require the right name and a location within 30–45 km of the city; logos are filtered out automatically; every photo was reviewed by eye on a contact sheet before shipping, and wrong ones are blocked in `content/image-overrides.json`.
- **Five wrong matches caught in review and blocked:** The Bowery Hotel (matched The Bowery House), The Ritz-Carlton NoMad (matched the Central Park Ritz), Toronto Island Park (matched its disc-golf course), Commercial Drive (matched a SkyTrain station), the Waldorf Astoria (an old print of the original building). Museum of Vancouver's share image was a text banner, also blocked.
- **No photo is better than a logo.** About 90 picks (mostly restaurants, whose sites often publish a logo as their share image) show a vivid illustrated card in the city's colours until a real photo is found.
- **Palette turned up.** Clean white canvas so photos glow; Reclo pink `#E8175D` for actions; highlighter yellow for ranks; saturated city colours on chips, tabs and pride labels. Fonts and the bookmark icon are unchanged.
- **Tabs wrap into a 2×2 grid on phones with short labels** ("Eat & drink"), so no label is ever cut off; the full name stays available to screen readers.
- **A booking-style action bar on pick pages (phones):** rank, name, Share, Website or Book.

## v1.2 (owner feedback)

- **Honest about how lists are made.** The site now says the research is done with AI, following a public brief, and that nothing is hand-picked by a person yet. Earlier copy implied a person had read every source.
- **Search shows everything.** Typing in the search dialog shows the top matches with photos and a "See all" link; the full results page shows every matching place in every city as photo cards.
- **Voice search** uses the browser's own speech recognition, shown only where supported. The privacy page explains that some browsers send the audio to their maker's servers; Reclo only ever receives the text.
- **Save and compare, with no account.** Hearts on every place; saved places live in the browser (localStorage) and never leave the device. The Saved page shows them as cards or in a side-by-side table (rank, city, type, neighbourhood, price, why, sources, website).
- **Stories only.** The square "post card" confused people and is gone; "Share to your story" sends the 9:16 image straight into the phone's share sheet (Instagram, Messages), with the place's photo in it.
- **Arrow buttons on every row,** hidden when a row fits; swipe still works on phones.
- **Become a curator page,** aimed at creators but open to anyone, with clear rules (been recently, disclose comps, never paid placement). Applications go to `RECLO_CURATOR_URL` (a GitHub form until a form or address is chosen). Curator reviews aren't live yet and the page says so.
- **More photos:** Wikipedia's chosen free image, deeper website scans past logos, a real browser for sites that load photos with JavaScript, and a strict Commons title search. Every new photo is reviewed on a contact sheet; per-place controls in `content/image-overrides.json` skip a bad source without blocking the place.

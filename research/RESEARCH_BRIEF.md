# Reclo research brief (read fully before starting)

Reclo is an honest, evidence-backed list of the best places in a city. **Trust is the whole product.**
One invented or closed place does more damage than a hundred missing ones. A shorter true list beats a longer padded one.

Today is 2026-10-11.

## Your job
Research ONE city + ONE category (given in your task) and write a JSON file of up to 25 verified entries
(aim for 25, plus up to 5 extra verified backups so the final list can be balanced). Never pad.

## Hard rules (non-negotiable)
1. **Real and verified.** Every entry must be a real place that exists today, supported by **at least two independent
   sources you actually opened with WebFetch** (not just seen in a search snippet). Each source page must actually mention the place.
2. **Independent** means different publishers. Two articles from the same outlet or the same parent publication count once.
   The place's own website is NOT evidence (put it in `website`). Booking sites (Booking.com, Expedia, Tripadvisor listings,
   Yelp listings), aggregator SEO listicles, and AI-generated content farms are NOT evidence.
3. **Good evidence**: award lists (Michelin Guide incl. Michelin Keys for hotels, World's 50 Best, Forbes Travel Guide,
   national "best restaurants" awards, e.g. Canada's 100 Best, Vancouver Magazine Restaurant Awards, NYT critic reviews),
   respected guides (Michelin, Condé Nast Traveler, Travel + Leisure, Lonely Planet, Time Out, Eater, The Infatuation),
   serious local press and critics (newspapers, city magazines), official tourism boards (max ONE per entry,
   only for things to do), and established institutions (e.g. UNESCO, national park bodies).
4. **Closure check.** For every restaurant and hotel, search "<name> closed" / "<name> closing 2026" and confirm signs it is
   open now (official site with current hours/booking, recent 2026 coverage). Exclude anything closed, "temporarily closed",
   or announced as closing. Note what you checked in `closureCheck`.
5. **Own words only.** `description` and `why` must be written fresh in Reclo's voice. Never copy or closely paraphrase
   a source's sentences. Never reproduce any source's ranking order.
6. **No guessing fields.** If you don't know price level or neighbourhood from a source, use null. Never guess a URL —
   only include URLs you opened or that a source links to as the official site.
7. **Balance.** Across your entries aim for a range of neighbourhoods, prices and styles (e.g. not 15 tasting menus).
   Restaurants & cafés must include some genuinely great cafés/bakeries and casual spots, not only fine dining.
   Hotels = hotels only (no Airbnb/vacation rentals, no hostels unless genuinely exceptional and well-covered).
   Things to do = attractions, museums, parks, neighbourhoods, markets, experiences.

## Voice
- `description`: one line, max ~110 characters, plain and specific. e.g. "Counter-seat omakase from a chef who trained in Ginza."
- `why`: one line, max ~110 characters, like a friend who's been, grounded in the evidence you found.
  e.g. "On every serious ramen list in the city, and the queue proves it." Warm, never cringe, no exclamation marks, no hype words like "hidden gem".

## Output
Write the file path given in your task with exactly this JSON shape (valid JSON, UTF-8, no comments):

```json
{
  "city": "vancouver",
  "category": "restaurants",
  "researchedOn": "2026-10-11",
  "entries": [
    {
      "name": "Official name as the place writes it",
      "localName": null,
      "neighbourhood": "Gastown",
      "subtype": "short style tag, e.g. 'Cantonese', 'café', 'bakery', 'boutique hotel', 'museum', 'park', 'market'",
      "description": "…",
      "why": "…",
      "price": 2,
      "website": "https://official-site.example",
      "address": "Street address if a source or official site gives it, else null",
      "evidence": [
        {
          "publisher": "Michelin Guide",
          "domain": "guide.michelin.com",
          "url": "https://… (the exact page you opened)",
          "title": "Page title",
          "kind": "award | guide | critic | list | local-press | tourism | institution",
          "published": "YYYY-MM-DD or YYYY-MM or YYYY or null",
          "afterVisit": true,
          "supports": "What this source says about the place, in your own words, max 20 words"
        }
      ],
      "closureCheck": "e.g. Official site shows Oct 2026 hours and reservations; no closure news found."
    }
  ],
  "rejected": [
    { "name": "Place", "reason": "Closed Aug 2026 per Daily Hive" }
  ]
}
```

Field notes:
- `price`: 1–4 ($ to $$$$) for restaurants and hotels; for things to do use 0 for free, 1–4 otherwise, null if unknown.
- `afterVisit`: true for reviews/awards/guides written from an actual visit; false for pre-opening buzz, announcements, press releases.
- 2 to 4 evidence items per entry. Prefer the strongest, most recent ones.
- `localName`: the name in local script/language where natural (e.g. Japanese/Korean script), else null.

Work efficiently: open a handful of strong list/award pages first (each supports many places), then fill gaps with
targeted searches. Before finishing, re-read your JSON and delete any entry that doesn't meet every rule.
Finish by replying with: number of entries, number rejected, and any doubts.

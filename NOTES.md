# Review notes: the three-question test

Every key screen was reviewed by asking what Steve Jobs, Brian Chesky and the founder would say. Where the answer was "not yet", the fix is recorded and was made before shipping. Screens were checked as screenshots at 320, 390 and 1280 px, light and dark, and through the end-to-end tests.

## Landing

- **Jobs:** One line, one sentence, one search, one shelf. Passes the five-second test. *Not yet (fixed):* a toast element was showing as an empty dark pill; it's now fully hidden until it has something to say. The search placeholder was truncating on phones; shortened to "Try "ramen" or "Toronto"".
- **Chesky:** The shelf is the moment: notebooks slide on in a springy cascade, finished ones first, so the first tap lands somewhere full. The link preview (big tagline + a row of notebook spines) is the real first frame for most people.
- **Founder:** Seven of ten notebooks say *Being researched*. That is honest and stays. No banner, no sign-up, nothing to accept.

## Opening a city

- **Jobs:** Cover, dividers, the first page of each list. No explanation needed. *Not yet (fixed):* at 320 px the logo mark was being squeezed out of the header; it no longer shrinks.
- **Chesky:** Each city feels like a place (Seoul's celadon steps and 서울, New York's taxi-yellow grid) inside one family.
- **Founder:** Empty tabs say why they're empty and link to finished notebooks instead of pretending.

## Browsing a list

- **Jobs:** Rank, name, where/what, why, proof. Every row has the same five things in the same order. Rows are links with a single clear target (44 px+).
- **Chesky:** The why-line is in a friend's handwriting-like italic; "4 sources, checked 11 Oct 2026" quietly earns trust on every row.
- **Founder:** *Not yet (fixed):* the first ranking draft pushed MoMA to #25 and The Met out of New York's top 25, because undated guide pages were treated as old and the variety penalty started at the second museum. Both rules were wrong, not the data; fixed in the open, documented on /how-reclo-ranks, and covered by tests. Short lists (Vancouver hotels 13, Toronto hotels 20) carry a note instead of padding.

## Viewing a pick

- **Jobs:** The pride line, the name, why it's here, the receipts, good-to-know, share. *Not yet (fixed):* the stamp's date overlapped its ring; redrawn.
- **Chesky:** The rank number travels from the list into the page, the stamp lands, and the receipts show who said what and when. "Made the list?" turns businesses into ambassadors without selling anything.
- **Founder:** Every receipt links to the page we read, says what it says in our words, and shows when we read it. No photo is better than a scraped one; the designed fallback looks deliberate. Hotels book directly with the hotel.

## Searching

- **Jobs:** Instant, forgiving, works offline once loaded. Empty state tells you what to try. *Not yet (fixed):* focusing the header search with the keyboard popped the dialog open, which traps tabbing; it now opens on tap or first keystroke only, and a test guards it.
- **Chesky:** Suggestions appear before you type; arrow keys and Enter work; local scripts (東京, 서울) and accents just work.
- **Founder:** Search runs in the browser. What you type never leaves your device.

## Sharing

- **Jobs:** One button. Native share sheet on phones; on desktop the link is copied with a "Link copied" toast. Story and post cards are one tap.
- **Chesky:** Every page has a designed preview, so the group-chat frame is as considered as the hero. Cards carry the rank, the why and the sources, so they persuade on their own.
- **Founder:** Cards are rendered from the same tokens as the app; nothing promotional, and the badge says "Never for sale".

## Still open (not blockers, logged for v1.1)

- Licensed photography per pick (schema ready; needs per-file licence checks).
- Trusted event calendars per city (pipeline ready; needs curation).
- More independent sources for entries resting on exactly two, and stronger closure checks for the entries flagged in `research/raw/` notes.

/**
 * The Reclo copy deck. Every user-facing phrase lives here so the voice stays
 * consistent: warm, plain, specific, never salesy. See DESIGN.md › Voice.
 */
import type { CategoryId } from '../schema/types.ts';

export interface CategoryCopy {
  id: CategoryId;
  /** Tab and heading label. */
  label: string;
  /** Lowercase phrase used mid-sentence. */
  phrase: string;
  /** Singular used for rank pride lines: "#1 place to eat in Lisbon". */
  singular: string;
  /** Short description under the list title. */
  blurb: string;
  /** Search keywords that should find this list. */
  keywords: string;
}

export const CATEGORY_COPY: Record<CategoryId, CategoryCopy> = {
  restaurants: {
    id: 'restaurants',
    label: 'Restaurants & cafés',
    phrase: 'restaurants and cafés',
    singular: 'place to eat',
    blurb: 'Tasting menus to noodle counters, with good coffee in between.',
    keywords: 'restaurants restaurant cafes cafe coffee bakery bakeries food eat eating dining dinner lunch brunch breakfast',
  },
  hotels: {
    id: 'hotels',
    label: 'Hotels',
    phrase: 'hotels',
    singular: 'hotel',
    blurb: 'Places to stay, from grand old landmarks to small, well-loved rooms.',
    keywords: 'hotels hotel stay stays sleep accommodation lodging rooms',
  },
  'things-to-do': {
    id: 'things-to-do',
    label: 'Things to do',
    phrase: 'things to do',
    singular: 'thing to do',
    blurb: 'Museums, parks, markets and neighbourhoods worth the walk.',
    keywords: 'things to do see sights sightseeing attractions museums museum parks park markets neighbourhoods activities',
  },
  events: {
    id: 'events',
    label: 'This week',
    phrase: 'events this week',
    singular: 'event',
    blurb: 'Concerts and local happenings in the next seven days.',
    keywords: 'events event this week concerts concert shows gigs music tonight',
  },
};

export const COPY = {
  tagline: 'The best of every city, with the receipts.',
  intro:
    'A free notebook of where to eat, stay and go in ten cities. Every pick shows the independent evidence behind it, and nobody can pay to be here.',
  searchLabel: 'Search cities, places and lists',
  searchPlaceholder: 'Try “pizza” or “Toronto”',
  shelfTitle: 'Pick a notebook',
  promises: [
    { title: 'Every pick shows its receipts', body: 'Two or more independent sources, linked, with the date we checked.' },
    { title: 'Nothing here is for sale', body: 'No ads, no sponsored spots, no paid placement. Ever.' },
    { title: 'Nothing about you is collected', body: 'No accounts, no cookies, no tracking. Just the notebook.' },
  ],
  researching: 'Being researched',
  researchingTitle: 'This page is still being researched',
  researchingBody:
    'We’d rather leave it blank than guess. Every pick has to be checked against independent sources before it goes in, and this one isn’t finished yet.',
  shortList: (n: number) =>
    `${n} verified so far. We only publish what we can back up, so this list grows as we check more places.`,
  eventsEmptyTitle: 'This week’s page is still blank',
  eventsEmptyBody:
    'We’re choosing calendars we trust for this city. Until then, you’ll find nothing here rather than something made up.',
  eventsNoneThisWeek: 'Nothing on the calendars we follow for the next seven days. Check back tomorrow.',
  whyHeading: 'Why it’s here',
  receiptsHeading: 'The receipts',
  receiptsIntro: 'Independent sources that recommend it. We read every one; the words below are ours.',
  practicalHeading: 'Good to know',
  checked: 'Checked',
  shareHeading: 'Send it to someone',
  shareLink: 'Share link',
  copied: 'Link copied',
  storyCard: 'Story card',
  postCard: 'Post card',
  madeTheList: 'Made the list?',
  madeTheListBody:
    'If this is your place, congratulations. Here’s a card to share. You didn’t pay for it and nobody else can either.',
  badgeCard: 'Download your card',
  tellUs: 'Spot something wrong or missing? Tell us',
  noResults: (q: string) => `Nothing in the notebook for “${q}” yet.`,
  noResultsHint: 'Try a city, a neighbourhood or a kind of place, like “pizza” or “museum”.',
  footerPromise: 'No ads. No paid placement. No tracking.',
  howWeRank: 'How Reclo ranks',
  privacy: 'Privacy',
};

export const PRICE_LABEL = ['Free', '$', '$$', '$$$', '$$$$'] as const;
export const PRICE_WORDS = ['Free', 'Inexpensive', 'Moderate', 'Pricey', 'Very expensive'] as const;

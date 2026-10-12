/**
 * The Reclo data model. Content lives as JSON in /content and is validated
 * against these shapes (see validate.ts) on every build. A build fails if any
 * entry is missing a required field or doesn't carry enough independent evidence.
 */

export const STATIC_CATEGORIES = ['restaurants', 'hotels', 'things-to-do'] as const;
export const CATEGORIES = [...STATIC_CATEGORIES, 'events'] as const;

export type StaticCategoryId = (typeof STATIC_CATEGORIES)[number];
export type CategoryId = (typeof CATEGORIES)[number];

/** How many picks a published list shows. Raise this (toward 100) as lists grow; nothing else changes. */
export const LIST_SIZE = 25;

/** Entries not re-verified within this many days are flagged as stale by the link checker. */
export const STALE_AFTER_DAYS = 183;

export type PatternId = 'waves' | 'grid' | 'blocks' | 'arches' | 'dots' | 'tiles' | 'sun' | 'petals' | 'zigzag' | 'stripes';

export interface City {
  /** URL slug, e.g. "mexico-city". */
  id: string;
  /** English name, e.g. "Seoul". */
  name: string;
  /** Name in local script or language, when it differs, e.g. "서울". */
  localName: string | null;
  /** BCP-47 language of localName, for correct screen-reader pronunciation. */
  localLang: string | null;
  country: string;
  /** IANA time zone, used for event times. */
  timezone: string;
  /** Cover colour. Must reach 4.5:1 contrast with `accentInk`. */
  accent: string;
  /** Text colour used on top of the accent. */
  accentInk: string;
  pattern: PatternId;
  /** One short line in Reclo's voice that appears on the cover. */
  tagline: string;
  /** Wikidata id, used to find the city's licensed cover photo. */
  wikidata: string | null;
}

export type SourceTier = 1 | 2 | 3;

export interface Source {
  id: string;
  name: string;
  /** Domains this publisher publishes on; evidence URLs must match one of them. */
  domains: string[];
  /**
   * 1 = major awards and lead critics (Michelin, Forbes Travel Guide, national awards, newspaper critics).
   * 2 = respected guides (Lonely Planet, Time Out, The Infatuation, Fodor's...).
   * 3 = local press, roundups, tourism boards and institutions.
   * Tiers are a documented human judgement; see /how-reclo-ranks.
   */
  tier: SourceTier;
  /** Publishers owned by the same parent share a group and count once for independence. */
  group: string;
}

export type EvidenceKind = 'award' | 'guide' | 'critic' | 'list' | 'local-press' | 'tourism' | 'institution';

export interface Evidence {
  /** Id in content/sources.json. */
  source: string;
  url: string;
  title: string;
  kind: EvidenceKind;
  /** Publication date as YYYY, YYYY-MM or YYYY-MM-DD, or null if the page shows none. */
  published: string | null;
  /** True for reviews, awards and guides written from a real visit; false for announcements and pre-opening buzz. */
  afterVisit: boolean;
  /** What the source says about the place, in Reclo's own words. */
  supports: string;
  /** When Reclo last opened this page (YYYY-MM-DD). */
  checked: string;
}

export interface ImageCredit {
  /** Path under /public or an https URL on a host we're allowed to use (e.g. upload.wikimedia.org). */
  src: string;
  alt: string;
  credit: string;
  license: string;
  sourceUrl: string;
}

export type PriceLevel = 0 | 1 | 2 | 3 | 4;

export interface Entry {
  /** URL slug, unique within its list. */
  id: string;
  name: string;
  localName: string | null;
  neighbourhood: string | null;
  /** Short style tag, e.g. "café", "ramen", "museum". Used for search and for list balance. */
  subtype: string;
  /** One line, Reclo's own words. */
  description: string;
  /** One line, like a friend's recommendation, grounded in the evidence. */
  why: string;
  /** 0 = free, 1–4 = $ to $$$$, null = unknown. */
  price: PriceLevel | null;
  website: string | null;
  address: string | null;
  image: ImageCredit | null;
  /** Optional honest caveat shown on the pick, e.g. seasonal opening. */
  note: string | null;
  evidence: Evidence[];
  lastVerified: string;
  /** How we checked it's still open. Kept for the record; not shown publicly. */
  closureCheck: string;
}

export type ListStatus = 'researched' | 'researching';

export interface ListFile {
  city: string;
  category: StaticCategoryId;
  status: ListStatus;
  updated: string;
  entries: Entry[];
}

export interface EventItem {
  id: string;
  name: string;
  /** ISO 8601 with the city's UTC offset, e.g. 2026-10-14T19:30:00-07:00. */
  startsAt: string;
  endsAt: string | null;
  venue: string;
  url: string;
  /** Short label for the kind of event, e.g. "Concert". */
  kind: string | null;
}

export interface EventsFile {
  city: string;
  /** Provider id that produced this file, or null when no source is configured. */
  source: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  fetchedAt: string | null;
  events: EventItem[];
}

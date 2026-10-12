/**
 * How Reclo ranks (the mechanical part). Every number here is explained on the
 * public /how-reclo-ranks page; change them together.
 *
 * 1. Score each entry by the strength and independence of its evidence.
 * 2. Apply the hype filter (pre-visit buzz and press-release echoes count for less).
 * 3. Build the list greedily with a gentle variety penalty so a top 25 isn't
 *    25 versions of the same thing.
 *
 * The human-judgement parts (which sources exist, their tier, whether a piece
 * was written after a visit) live in the data, not here.
 */
import type { Entry, Evidence, EvidenceKind, Source, SourceTier } from '../schema/types.ts';
import { daysBetween, parsePartialDate } from '../schema/validate.ts';

export const TIER_WEIGHT: Record<SourceTier, number> = { 1: 3, 2: 2, 3: 1 };

export const KIND_WEIGHT: Record<EvidenceKind, number> = {
  award: 1.25,
  critic: 1.15,
  guide: 1,
  list: 0.9,
  'local-press': 0.9,
  institution: 0.6,
  tourism: 0.6,
};

/** Pre-visit buzz, announcements and press releases count for half. */
export const BEFORE_VISIT_FACTOR = 0.5;

export const UNDATED_FACTOR = 0.9;

/** Older evidence still counts, but recent evidence counts more. */
export function recencyFactor(published: string | null, today: Date): number {
  // Undated pages are usually evergreen guide entries that get maintained; they count a little less than fresh ones.
  if (!published) return UNDATED_FACTOR;
  const d = parsePartialDate(published);
  if (!d) return UNDATED_FACTOR;
  const days = daysBetween(d, today);
  if (days <= 548) return 1; // within ~18 months
  if (days <= 1095) return 0.85; // within 3 years
  if (days <= 1826) return 0.7; // within 5 years
  return 0.55;
}

/** Each additional independent publisher adds less than the one before. */
export const DIMINISHING = [1, 0.8, 0.65, 0.5];

/** Two non-visit pieces published within this many days of each other look like one press push. */
export const ECHO_WINDOW_DAYS = 3;

export interface ScoredEvidence {
  evidence: Evidence;
  source: Source;
  points: number;
  /** Why this item counted for less, if it did. */
  discounts: string[];
}

export interface Score {
  total: number;
  items: ScoredEvidence[];
}

/**
 * Hype filter, part 2: when several pieces were NOT written after a visit and
 * were published within a few days of each other, treat them as one press
 * push and keep only the strongest.
 */
export function collapseEchoes(items: ScoredEvidence[]): ScoredEvidence[] {
  const buzz = items.filter((i) => !i.evidence.afterVisit && i.evidence.published && parsePartialDate(i.evidence.published));
  const dropped = new Set<ScoredEvidence>();
  const sorted = [...buzz].sort((a, b) => b.points - a.points);
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]!;
    if (dropped.has(a)) continue;
    // Only day-precise dates can be compared this tightly.
    if (a.evidence.published!.length !== 10) continue;
    const da = parsePartialDate(a.evidence.published!)!;
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j]!;
      if (dropped.has(b) || b.evidence.published!.length !== 10) continue;
      const db = parsePartialDate(b.evidence.published!)!;
      if (Math.abs(daysBetween(da, db)) <= ECHO_WINDOW_DAYS) dropped.add(b);
    }
  }
  return items.map((i) =>
    dropped.has(i) ? { ...i, points: 0, discounts: [...i.discounts, 'echoes another announcement from the same week'] } : i,
  );
}

export function scoreEntry(entry: Entry, sources: Map<string, Source>, today: Date): Score {
  let items: ScoredEvidence[] = entry.evidence.map((evidence) => {
    const source = sources.get(evidence.source);
    if (!source) throw new Error(`Unknown source "${evidence.source}" on ${entry.name}`);
    const discounts: string[] = [];
    let points = TIER_WEIGHT[source.tier] * KIND_WEIGHT[evidence.kind];
    if (!evidence.afterVisit) {
      points *= BEFORE_VISIT_FACTOR;
      discounts.push('not written after a visit');
    }
    const r = recencyFactor(evidence.published, today);
    if (r < 1) discounts.push(evidence.published ? 'older than 18 months' : 'undated');
    points *= r;
    return { evidence, source, points, discounts };
  });

  items = collapseEchoes(items);

  // Independence: one publisher group counts once (its strongest piece).
  const bestByGroup = new Map<string, ScoredEvidence>();
  for (const item of items) {
    const prev = bestByGroup.get(item.source.group);
    if (!prev || item.points > prev.points) bestByGroup.set(item.source.group, item);
  }
  const counted = [...bestByGroup.values()].sort((a, b) => b.points - a.points);
  const total = counted.reduce((sum, item, i) => sum + item.points * (DIMINISHING[i] ?? DIMINISHING.at(-1)!), 0);
  return { total: Math.round(total * 1000) / 1000, items };
}

/**
 * Variety: the first few picks of any one style or neighbourhood are free.
 * After that, each further pick of the same style costs 12%, and of the same
 * neighbourhood 8%, compounding. Strong evidence still wins; it just has to be
 * stronger the more the list already has of that thing.
 */
export const SAME_SUBTYPE_PENALTY = 0.88;
export const SUBTYPE_FREE_REPEATS = 3;
export const SAME_NEIGHBOURHOOD_PENALTY = 0.92;
export const NEIGHBOURHOOD_FREE_REPEATS = 3;

/** Number of independent publisher groups behind an entry. */
export function independentCount(score: Score): number {
  return new Set(score.items.filter((i) => i.points > 0).map((i) => i.source.group)).size;
}

/** The newest dated piece of evidence, as a timestamp (0 if none are dated). */
export function newestEvidence(entry: Entry): number {
  let newest = 0;
  for (const ev of entry.evidence) {
    const d = ev.published ? parsePartialDate(ev.published) : null;
    if (d && d.getTime() > newest) newest = d.getTime();
  }
  return newest;
}

interface Candidate {
  entry: Entry;
  score: Score;
}

/** Ties break by more independent sources, then fresher evidence, then name (for determinism). */
export function compareCandidates(a: Candidate, b: Candidate): number {
  return (
    b.score.total - a.score.total ||
    independentCount(b.score) - independentCount(a.score) ||
    newestEvidence(b.entry) - newestEvidence(a.entry) ||
    a.entry.name.localeCompare(b.entry.name)
  );
}

export function subtypeKey(subtype: string): string {
  return subtype
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export interface RankedEntry {
  rank: number;
  entry: Entry;
  score: Score;
  /** Score after the variety adjustment at the moment it was picked. */
  adjusted: number;
}

/**
 * Orders a list. Deterministic: see compareCandidates for tie-breaks. Returns at most `limit`
 * entries; the rest stay in the data as verified backups.
 */
export function rankList(entries: Entry[], sources: Map<string, Source>, today: Date, limit: number): RankedEntry[] {
  const pool = entries
    .map((entry) => ({ entry, score: scoreEntry(entry, sources, today) }))
    .sort(compareCandidates);

  const result: RankedEntry[] = [];
  const subtypeCount = new Map<string, number>();
  const hoodCount = new Map<string, number>();

  while (pool.length > 0 && result.length < limit) {
    let bestIdx = 0;
    let bestAdj = -Infinity;
    pool.forEach((c, idx) => {
      const st = subtypeCount.get(subtypeKey(c.entry.subtype)) ?? 0;
      const hood = c.entry.neighbourhood ? (hoodCount.get(c.entry.neighbourhood.toLowerCase()) ?? 0) : 0;
      const adj =
        c.score.total *
        SAME_SUBTYPE_PENALTY ** Math.max(0, st - SUBTYPE_FREE_REPEATS + 1) *
        SAME_NEIGHBOURHOOD_PENALTY ** Math.max(0, hood - NEIGHBOURHOOD_FREE_REPEATS + 1);
      if (adj > bestAdj + 1e-9) {
        bestAdj = adj;
        bestIdx = idx;
      }
    });
    const [picked] = pool.splice(bestIdx, 1);
    const p = picked!;
    result.push({ rank: result.length + 1, entry: p.entry, score: p.score, adjusted: Math.round(bestAdj * 1000) / 1000 });
    const sk = subtypeKey(p.entry.subtype);
    subtypeCount.set(sk, (subtypeCount.get(sk) ?? 0) + 1);
    if (p.entry.neighbourhood) {
      const hk = p.entry.neighbourhood.toLowerCase();
      hoodCount.set(hk, (hoodCount.get(hk) ?? 0) + 1);
    }
  }
  return result;
}

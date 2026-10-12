/** Deciding whether a Wikidata item is the same place as a pick, by name. Used by scripts/fetch-images.ts. */

export const norm = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(the|a|of|and|at|new york|toronto|vancouver|nyc)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Same place? The names must share most of their words: one may add at most one
 * word to the other ("Hotel Georgia" ~ "Rosewood Hotel Georgia"), or they must
 * overlap by at least 60%. This rejects near-misses like "The Bowery House" for
 * "The Bowery Hotel" or a disc-golf course for the park it sits in.
 */
export function namesMatch(label: string, name: string): boolean {
  const a = new Set(norm(label).split(' ').filter(Boolean));
  const b = new Set(norm(name).split(' ').filter(Boolean));
  if (!a.size || !b.size) return false;
  const shared = [...a].filter((w) => b.has(w)).length;
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  if (shared === small.size && big.size - small.size <= 1) return true;
  return shared / new Set([...a, ...b]).size >= 0.6;
}

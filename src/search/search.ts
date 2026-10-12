/**
 * Reclo search: a tiny, dependency-free index that runs entirely in the
 * browser. The same code builds the index at build time and queries it in the
 * client, so what the tests check is what people get.
 *
 * - Accent-insensitive: "cafe" matches "Café", "sao" matches "São".
 * - Prefix matching for type-ahead: "kiss" finds "Kissa Tanto".
 * - Forgives one typo in longer words: "musuem" finds "museum".
 * - Non-Latin scripts work too: "서울" finds Seoul, "東京" finds Tokyo.
 */

export type DocType = 'city' | 'list' | 'pick';

export interface SearchDoc {
  /** Type of result. */
  t: DocType;
  /** Path relative to the site root, e.g. "vancouver/restaurants/annalena/". */
  u: string;
  /** Display title. */
  n: string;
  /** Display subtitle. */
  s: string;
  /** Normalised tokens for matching names (higher weight). */
  nx: string;
  /** Normalised tokens for everything else. */
  x: string;
  /** Rank within its list, for picks. */
  r?: number;
  /** City accent colour, for the result marker. */
  a?: string;
  /** 1 when the city or list has no verified picks yet; it sinks below real results. */
  z?: 1;
}

export interface SearchHit {
  doc: SearchDoc;
  score: number;
}

const CJK = /[぀-ヿ㐀-鿿가-힯ᄀ-ᇿ]/;

export function normalize(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .replace(/ø/g, 'o')
    .replace(/[’'`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function tokens(text: string): string[] {
  const n = normalize(text);
  return n ? n.split(' ') : [];
}

/** Levenshtein distance capped at 2 (we only care whether it's ≤ 1). */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (la > lb) i++;
    else if (lb > la) j++;
    else if (a[i + 1] === b[j] && a[i] === b[j + 1]) {
      // transposition counts as one edit
      i += 2;
      j += 2;
    } else {
      i++;
      j++;
    }
  }
  return edits + (la - i) + (lb - j) <= 1;
}

function matchToken(q: string, docTokens: string[]): number {
  let best = 0;
  for (const t of docTokens) {
    if (t === q) return 3;
    if (t.startsWith(q)) best = Math.max(best, q.length >= 2 || CJK.test(q) ? 2 : 1.5);
    else if (CJK.test(q) && t.includes(q)) best = Math.max(best, 1.5);
    else if (q.length >= 4 && t.length >= 4 && (withinOneEdit(q, t) || (t.length > q.length && withinOneEdit(q, t.slice(0, q.length))))) {
      // one typo, either in a whole word or in what's been typed so far
      best = Math.max(best, 1);
    }
  }
  return best;
}

const TYPE_BOOST: Record<DocType, number> = { city: 3, list: 2, pick: 0 };

/** Very common words that shouldn't stop a match when they aren't in a document. */
const SOFT_WORDS = new Set(['the', 'in', 'a', 'an', 'of', 'best', 'top', 'to', 'and', 'de', 'la', 'le', 'el', 'near', 'good', 'great']);

export function search(index: SearchDoc[], query: string, limit = 12): SearchHit[] {
  const qTokens = tokens(query);
  if (qTokens.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const doc of index) {
    const nameTokens = doc.nx ? doc.nx.split(' ') : [];
    const otherTokens = doc.x ? doc.x.split(' ') : [];
    let score = 0;
    let ok = true;
    let hard = 0;
    for (const q of qTokens) {
      const inName = matchToken(q, nameTokens) * 1.6;
      const inOther = matchToken(q, otherTokens);
      const m = Math.max(inName, inOther);
      if (m === 0) {
        if (SOFT_WORDS.has(q)) continue;
        ok = false;
        break;
      }
      hard++;
      score += m;
    }
    if (!ok || hard === 0) continue;
    score += TYPE_BOOST[doc.t];
    if (doc.z) score -= 3.5;
    if (doc.r) score += (26 - Math.min(doc.r, 25)) / 50;
    hits.push({ doc, score });
  }
  hits.sort((a, b) => b.score - a.score || a.doc.n.localeCompare(b.doc.n));
  return hits.slice(0, limit);
}

export function makeDoc(input: {
  t: DocType;
  u: string;
  n: string;
  s: string;
  names: (string | null | undefined)[];
  keywords: (string | null | undefined)[];
  r?: number;
  a?: string;
  empty?: boolean;
}): SearchDoc {
  const doc: SearchDoc = {
    t: input.t,
    u: input.u,
    n: input.n,
    s: input.s,
    nx: [...new Set(input.names.filter(Boolean).flatMap((s) => tokens(s!)))].join(' '),
    x: [...new Set(input.keywords.filter(Boolean).flatMap((s) => tokens(s!)))].join(' '),
  };
  if (input.r) doc.r = input.r;
  if (input.a) doc.a = input.a;
  if (input.empty) doc.z = 1;
  return doc;
}

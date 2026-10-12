/** URL-safe slug: "Café de l'Époque" → "cafe-de-lepoque". Non-Latin names fall back to a short hash. */
export function slugify(input: string): string {
  const s = input
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s) return s.slice(0, 80).replace(/-+$/, '');
  let h = 0;
  for (const ch of input) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return `place-${h.toString(36)}`;
}

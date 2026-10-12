/**
 * Reclo's illustration system, drawn in code so every city cover, fallback
 * image and share card comes from the same tokens. Each city has a pattern
 * that nods to the place; each category has a hand-drawn-style glyph.
 */
import type { CategoryId, PatternId } from '../schema/types.ts';

/** A seamless 48×48 tile for each city pattern, drawn with `c` (stroke/fill colour). */
export function patternTile(id: PatternId, c: string): string {
  const s = `stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  switch (id) {
    case 'waves': // Vancouver: the sea and the ridge line behind it
      return `<path ${s} d="M0 14c8-7 16-7 24 0s16 7 24 0M0 38c8-7 16-7 24 0s16 7 24 0"/>`;
    case 'stripes': // Toronto: streetcar tracks
      return `<path ${s} d="M-6 18 18 -6M-6 42 42 -6M18 54 54 18M6 54 54 6"/>`;
    case 'grid': // New York: the street grid
      return `<path ${s} d="M0 12h48M0 36h48M16 0v48M40 0v48"/><rect x="21" y="17" width="14" height="14" fill="${c}" opacity=".35"/>`;
    case 'dots': // London: roundels
      return `<circle cx="12" cy="12" r="7" ${s}/><circle cx="36" cy="36" r="7" ${s}/><path ${s} d="M2 12h20M26 36h20"/>`;
    case 'arches': // Paris: Haussmann arches
      return `<path ${s} d="M4 24V14a8 8 0 0 1 16 0v10M28 48V38a8 8 0 0 1 16 0v10M28 0v-2M4 48v-2"/>`;
    case 'petals': // Tokyo: cherry blossom
      return `<g ${s}><circle cx="24" cy="24" r="2.5" fill="${c}"/><path d="M24 21c-3-5-1-10 0-11 1 1 3 6 0 11M27 24c5-3 10-1 11 0-1 1-6 3-11 0M24 27c3 5 1 10 0 11-1-1-3-6 0-11M21 24c-5 3-10 1-11 0 1-1 6-3 11 0"/></g>`;
    case 'sun': // Barcelona: Mediterranean sun
      return `<g ${s}><circle cx="24" cy="24" r="6"/><path d="M24 10v4M24 34v4M10 24h4M34 24h4M14 14l3 3M31 31l3 3M34 14l-3 3M17 31l-3 3"/></g>`;
    case 'tiles': // Lisbon: azulejo
      return `<g ${s}><rect x="2" y="2" width="44" height="44" rx="2"/><path d="M24 6c6 6 6 12 0 18-6-6-6-12 0-18zM24 42c6-6 6-12 0-18-6 6-6 12 0 18zM6 24c6-6 12-6 18 0-6 6-12 6-18 0zM42 24c-6-6-12-6-18 0 6 6 12 6 18 0z"/></g>`;
    case 'zigzag': // Mexico City: papel picado
      return `<path ${s} d="M0 10l6 6 6-6 6 6 6-6 6 6 6-6 6 6 6-6M0 34l6 6 6-6 6 6 6-6 6 6 6-6 6 6 6-6"/><circle cx="12" cy="24" r="2" fill="${c}"/><circle cx="36" cy="24" r="2" fill="${c}"/>`;
    case 'blocks': // Seoul: dancheong steps
      return `<path ${s} d="M0 40h12V28h12V16h12V4h12M0 16h6M42 40h6"/>`;
  }
}

export function patternDefs(id: PatternId, c: string, uid: string, scale = 1): string {
  const size = 48 * scale;
  return `<pattern id="${uid}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><g transform="scale(${scale})">${patternTile(id, c)}</g></pattern>`;
}

/** 24×24 line glyphs, one per category. */
export function categoryGlyph(id: CategoryId, c: string, strokeWidth = 1.7): string {
  const s = `stroke="${c}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  switch (id) {
    case 'restaurants': // a cup with steam
      return `<g ${s}><path d="M4 10h12v4a6 6 0 0 1-6 6h0a6 6 0 0 1-6-6z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3.5c-1 1 1 2 0 3.5M12 3.5c-1 1 1 2 0 3.5"/></g>`;
    case 'hotels': // a room key on its tag
      return `<g ${s}><circle cx="8" cy="8" r="4.5"/><path d="M11.2 11.2 20 20M16.5 16.5l2-2M18.5 18.5l1.5-1.5"/><circle cx="8" cy="8" r="1.2" fill="${c}"/></g>`;
    case 'things-to-do': // a compass
      return `<g ${s}><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/><circle cx="12" cy="12" r=".8" fill="${c}"/></g>`;
    case 'events': // a calendar page with a star
      return `<g ${s}><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="m12 11.8 1.1 2.2 2.4.3-1.8 1.6.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.6 2.4-.3z"/></g>`;
  }
}

/**
 * The designed fallback for a pick without a licensed photo: the city's cover
 * colour and pattern with the category glyph, like a page torn from that notebook.
 */
export function fallbackArt(opts: {
  uid: string;
  accent: string;
  ink: string;
  pattern: PatternId;
  category: CategoryId;
  width?: number;
  height?: number;
  label: string;
}): string {
  const w = opts.width ?? 800;
  const h = opts.height ?? 600;
  const g = Math.min(w, h) * 0.42;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeAttr(opts.label)}" preserveAspectRatio="xMidYMid slice"><defs>${patternDefs(opts.pattern, opts.ink, `p-${opts.uid}`, 1.6)}</defs><rect width="${w}" height="${h}" fill="${opts.accent}"/><rect width="${w}" height="${h}" fill="url(#p-${opts.uid})" opacity=".16"/><g transform="translate(${w - g * 1.18} ${h - g * 1.12}) scale(${g / 24})">${categoryGlyph(opts.category, opts.ink, 1.3)}</g></svg>`;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** The "Checked" rubber stamp, used on picks. Literal caps: it's a stamp. */
export function stampSvg(dateLabel: string, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><g fill="none" stroke="${color}" stroke-width="3"><circle cx="60" cy="60" r="55"/><circle cx="60" cy="60" r="45" stroke-width="1.5"/></g><path id="stamp-arc" d="M22 60a38 38 0 0 1 76 0" fill="none"/><text font-family="Inter, sans-serif" font-weight="600" font-size="13" letter-spacing="3" fill="${color}"><textPath href="#stamp-arc" startOffset="50%" text-anchor="middle">CHECKED</textPath></text><path d="m45 60 9 9 21-22" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><text x="60" y="92" text-anchor="middle" font-family="Inter, sans-serif" font-weight="600" font-size="9.5" letter-spacing=".5" fill="${color}">${escapeAttr(dateLabel.toUpperCase())}</text></svg>`;
}

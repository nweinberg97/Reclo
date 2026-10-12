import { raw, type Html } from '#jsx/jsx-runtime';
import type { City, CategoryId } from '../../schema/types.ts';
import { CATEGORIES } from '../../schema/types.ts';
import { categoryGlyph, fallbackArt, patternDefs, stampSvg } from '../art.ts';
import { CATEGORY_COPY, COPY } from '../copy.ts';
import { href } from '../config.ts';
import { routes } from '../routes.ts';
import { count, dateLabel } from '../format.ts';
import type { RankedEntry } from '../../ranking/rank.ts';

/** The patterned background that marks a city's notebook. */
export function PatternBg(props: { city: City; uid: string; opacity?: number; scale?: number }): Html {
  const { city } = props;
  return raw(
    `<svg class="pattern-bg" aria-hidden="true" focusable="false" preserveAspectRatio="none"><defs>${patternDefs(city.pattern, city.accentInk, `pat-${props.uid}`, props.scale ?? 1)}</defs><rect width="100%" height="100%" fill="url(#pat-${props.uid})" opacity="${props.opacity ?? 0.16}"/></svg>`,
  );
}

export function CityName(props: { city: City; tag?: 'h1' | 'h2' | 'span' }): Html {
  const { city } = props;
  const Tag = props.tag ?? 'span';
  return (
    <>
      {raw(`<${Tag} class="city-name">`)}
      <span class="city-name-en">{city.name}</span>
      {city.localName ? (
        <span class="city-name-local" lang={city.localLang ?? undefined}>
          {city.localName}
        </span>
      ) : null}
      {raw(`</${Tag}>`)}
    </>
  );
}

/** A notebook on the landing-page shelf. */
export function ShelfNotebook(props: { city: City; picks: number; index: number }): Html {
  const { city, picks } = props;
  const blank = picks === 0;
  return (
    <li class={`shelf-item${blank ? ' is-blank' : ''}`} style={`--i:${props.index}`}>
      <a
        class="notebook"
        href={href(routes.city(city.id))}
        style={`--accent:${city.accent};--accent-ink:${city.accentInk}`}
        aria-label={`${city.name}${city.localName ? ` (${city.localName})` : ''}: ${blank ? COPY.researching : count(picks, 'verified pick')}`}
      >
        <PatternBg city={city} uid={`shelf-${city.id}`} />
        <span class="notebook-spine" aria-hidden="true"></span>
        <span class="notebook-band" aria-hidden="true"></span>
        <span class="notebook-label">
          <CityName city={city} />
          <span class="notebook-country">{city.country}</span>
        </span>
        <span class="notebook-status">{blank ? COPY.researching : count(picks, 'pick')}</span>
      </a>
    </li>
  );
}

/** The big cover at the top of a city's notebook. */
export function Cover(props: { city: City; compact?: boolean; heading?: 'h1' | 'span'; picks?: number }): Html {
  const { city } = props;
  return (
    <div class={`cover${props.compact ? ' cover-compact' : ''}`} style={`--accent:${city.accent};--accent-ink:${city.accentInk}`}>
      <PatternBg city={city} uid={`cover-${city.id}${props.compact ? '-c' : ''}`} scale={props.compact ? 0.8 : 1.2} />
      <span class="cover-band" aria-hidden="true"></span>
      <div class="cover-inner">
        {props.compact ? (
          <a class="cover-link" href={href(routes.city(city.id))}>
            <CityName city={city} />
          </a>
        ) : (
          <>
            <p class="cover-country">{city.country}</p>
            <CityName city={city} tag={props.heading ?? 'h1'} />
            <p class="cover-tagline">{city.tagline}</p>
          </>
        )}
      </div>
    </div>
  );
}

/** Category dividers that stick out of the notebook like tabs. */
export function Tabs(props: { city: City; current?: CategoryId; counts: Record<CategoryId, number> }): Html {
  const { city } = props;
  return (
    <nav class="tabs" aria-label={`${city.name} lists`} style={`--accent:${city.accent};--accent-ink:${city.accentInk}`}>
      <ul>
        {CATEGORIES.map((cat) => {
          const isCurrent = props.current === cat;
          const n = props.counts[cat];
          return (
            <li>
              <a
                class={`tab${isCurrent ? ' is-current' : ''}`}
                href={href(routes.list(city.id, cat))}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {raw(`<svg class="tab-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${categoryGlyph(cat, 'currentColor')}</svg>`)}
                <span class="tab-label">{CATEGORY_COPY[cat].label}</span>
                {cat !== 'events' && n > 0 ? <span class="tab-count">{n}</span> : null}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The rank, scoreboard-style, on a highlighter swipe. */
export function Rank(props: { n: number; size?: 'row' | 'hero'; vt?: string }): Html {
  const tilt = (((props.n * 37) % 7) - 3) * 0.45;
  return (
    <span
      class={`rank rank-${props.size ?? 'row'}${props.n <= 3 ? ' rank-top' : ''}`}
      style={`--tilt:${tilt.toFixed(2)}deg${props.vt ? `;view-transition-name:${props.vt}` : ''}`}
    >
      <span class="visually-hidden">Number </span>
      {props.n}
    </span>
  );
}

export function PickRow(props: { city: City; category: CategoryId; p: RankedEntry }): Html {
  const { p, city, category } = props;
  const e = p.entry;
  const meta = [e.neighbourhood, e.subtype].filter(Boolean).join(', ');
  return (
    <li class="pick-row">
      <a class="pick-row-link" href={href(routes.pick(city.id, category, e.id))}>
        <Rank n={p.rank} vt={`rank-${e.id}`} />
        <span class="pick-row-body">
          <span class="pick-row-name">
            {e.name}
            {e.localName ? (
              <span class="pick-row-local" lang={city.localLang ?? undefined}>
                {' '}
                {e.localName}
              </span>
            ) : null}
          </span>
          <span class="pick-row-meta">{meta}</span>
          <span class="pick-row-why">{e.why}</span>
          <span class="pick-row-proof">
            {raw(CHECK_ICON)}
            {count(new Set(e.evidence.map((x) => x.source)).size, 'source')}, checked {dateLabel(e.lastVerified)}
          </span>
        </span>
      </a>
    </li>
  );
}

export const CHECK_ICON = `<svg class="icon icon-check" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function PickArt(props: { city: City; category: CategoryId; id: string; name: string }): Html {
  return raw(
    `<div class="pick-art">${fallbackArt({
      uid: props.id,
      accent: props.city.accent,
      ink: props.city.accentInk,
      pattern: props.city.pattern,
      category: props.category,
      label: `Illustration for ${props.name}: a page from Reclo's ${props.city.name} notebook`,
    })}</div>`,
  );
}

export function Stamp(props: { date: string; color?: string }): Html {
  return raw(`<span class="stamp">${stampSvg(dateLabel(props.date), props.color ?? 'currentColor')}</span>`);
}

export function EmptyPage(props: { title: string; body: string; glyph: CategoryId; children?: Html | null }): Html {
  return (
    <section class="empty-page">
      {raw(`<svg class="empty-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${categoryGlyph(props.glyph, 'currentColor', 1.2)}</svg>`)}
      <h2>{props.title}</h2>
      <p>{props.body}</p>
      {props.children ?? null}
    </section>
  );
}

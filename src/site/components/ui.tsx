/**
 * Reclo's visual building blocks: photos (with designed fallbacks), place
 * cards, city cards, rails and tabs. Photography leads; colour comes from the city.
 */
import { raw, type Child, type Html } from '#jsx/jsx-runtime';
import type { City, CategoryId } from '../../schema/types.ts';
import { CATEGORIES } from '../../schema/types.ts';
import type { Photo } from '../../lib/photos.ts';
import type { RankedEntry } from '../../ranking/rank.ts';
import { categoryGlyph, patternDefs, stampSvg } from '../art.ts';
import { CATEGORY_COPY } from '../copy.ts';
import { href } from '../config.ts';
import { routes } from '../routes.ts';
import { count, dateLabel } from '../format.ts';

export const imgSrc = (file: string) => href(`img/${file}`);

/** Lightens or darkens a hex colour: amt in [-1, 1]. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;
}

/** The designed stand-in when there's no photo: the city's colour, its pattern and the category glyph. */
export function ArtFallback(props: { city: City; category?: CategoryId; uid: string; label: string; glyphScale?: number }): Html {
  const { city } = props;
  const a = city.accent;
  const light = shade(a, 0.35);
  const deep = shade(a, -0.25);
  const glyph = props.category
    ? `<g transform="translate(250 170) scale(${(props.glyphScale ?? 5.2).toFixed(2)})" opacity=".95">${categoryGlyph(props.category, city.accentInk, 1.25)}</g>`
    : '';
  return raw(
    `<svg class="art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${props.label.replace(/"/g, '&quot;')}"><defs><linearGradient id="g-${props.uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset=".55" stop-color="${a}"/><stop offset="1" stop-color="${deep}"/></linearGradient><radialGradient id="r-${props.uid}" cx=".2" cy=".15" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>${patternDefs(city.pattern, city.accentInk, `p-${props.uid}`, 1.2)}</defs><rect width="400" height="300" fill="url(#g-${props.uid})"/><rect width="400" height="300" fill="url(#p-${props.uid})" opacity=".2"/><rect width="400" height="300" fill="url(#r-${props.uid})"/>${glyph}</svg>`,
  );
}

/** A photo with a colour placeholder, or the designed fallback. */
export function Pic(props: {
  photo: Photo | undefined;
  city: City;
  category?: CategoryId;
  uid: string;
  alt: string;
  sizes: string;
  eager?: boolean;
  className?: string;
  credit?: boolean;
  children?: Child;
}): Html {
  const { photo } = props;
  return (
    <figure class={`pic ${props.className ?? ''}`} style={photo ? `--ph:${photo.color}` : `--ph:${props.city.accent}`}>
      {photo ? (
        <img
          src={imgSrc(photo.small)}
          srcset={`${imgSrc(photo.small)} 720w, ${imgSrc(photo.file)} 1600w`}
          sizes={props.sizes}
          alt={props.alt}
          width={photo.width}
          height={photo.height}
          loading={props.eager ? 'eager' : 'lazy'}
          fetchpriority={props.eager ? 'high' : undefined}
          decoding="async"
        />
      ) : (
        <ArtFallback city={props.city} category={props.category} uid={props.uid} label={props.alt} />
      )}
      {props.children ?? null}
      {photo && props.credit ? <Credit photo={photo} /> : null}
    </figure>
  );
}

export function Credit(props: { photo: Photo }): Html {
  const p = props.photo;
  const text = p.kind === 'commons' ? `Photo: ${p.credit}${p.license ? `, ${p.license}` : ''}` : `Photo: ${p.credit}`;
  return (
    <figcaption class="credit">
      <a href={p.sourceUrl} rel="noopener">
        {text}
      </a>
    </figcaption>
  );
}

/** The rank on a highlighter tag, Reclo's signature. */
export function RankTag(props: { n: number; big?: boolean; vt?: string }): Html {
  return (
    <span class={`rank-tag${props.big ? ' rank-tag-big' : ''}`} style={props.vt ? `view-transition-name:${props.vt}` : undefined}>
      <span class="visually-hidden">Number </span>
      <span aria-hidden="true">#</span>
      {props.n}
    </span>
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

/** Heart button: saves a place on this device only. Works with the client script. */
export function SaveButton(props: { path: string; name: string; big?: boolean }): Html {
  return (
    <button type="button" class={`save-btn${props.big ? ' save-btn-big' : ''}`} data-save={props.path} aria-pressed="false" aria-label={`Save ${props.name}`}>
      {raw(HEART_ICON)}
      {props.big ? <span class="save-btn-label">Save</span> : null}
    </button>
  );
}

export const HEART_ICON = `<svg class="icon heart" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2.1 0 3.6 1.1 5 2.9 1.4-1.8 2.9-2.9 5-2.9 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;

/** A place, as a photo-led card: used in rails and in list grids. */
export function PlaceCard(props: { city: City; category: CategoryId; p: RankedEntry; photo: Photo | undefined; showCity?: boolean; eager?: boolean }): Html {
  const { p, city, category } = props;
  const e = p.entry;
  const meta = [props.showCity ? city.name : e.neighbourhood, e.subtype].filter(Boolean).join(' · ');
  const path = routes.pick(city.id, category, e.id);
  return (
    <li class="place-card">
      <a class="place-card-link" href={href(path)} title={props.photo ? `Photo: ${props.photo.credit}` : undefined}>
        <Pic
          photo={props.photo}
          city={city}
          category={category}
          uid={`c-${city.id}-${e.id}`}
          alt={props.photo ? `${e.name}` : `Illustration for ${e.name}`}
          sizes="(min-width: 1100px) 340px, (min-width: 700px) 45vw, 88vw"
          eager={props.eager}
          className="place-card-pic"
        >
          <RankTag n={p.rank} vt={`rank-${city.id}-${e.id}`} />
        </Pic>
        <span class="place-card-body">
          <span class="place-card-name">
            {e.name}
            {e.localName ? (
              <span class="place-card-local" lang={city.localLang ?? undefined}>
                {' '}
                {e.localName}
              </span>
            ) : null}
          </span>
          <span class="place-card-meta">{meta}</span>
          <span class="place-card-why">{e.why}</span>
          <span class="place-card-proof">
            {raw(CHECK_ICON)}
            {count(new Set(e.evidence.map((x) => x.source)).size, 'source')} · checked {dateLabel(e.lastVerified)}
          </span>
        </span>
      </a>
      <SaveButton path={path} name={e.name} />
    </li>
  );
}

/** A city, as a tall photo card. */
export function CityCard(props: { city: City; picks: number; photo: Photo | undefined; eager?: boolean }): Html {
  const { city, picks } = props;
  const blank = picks === 0;
  return (
    <li class={`city-card${blank ? ' is-soon' : ''}`}>
      <a
        class="city-card-link"
        href={href(routes.city(city.id))}
        style={`--accent:${city.accent};--accent-ink:${city.accentInk}`}
        aria-label={`${city.name}${city.localName ? ` (${city.localName})` : ''}: ${blank ? 'coming soon' : count(picks, 'pick')}`}
      >
        <Pic photo={props.photo} city={city} uid={`city-${city.id}`} alt="" sizes="(min-width: 1100px) 260px, 60vw" eager={props.eager} className="city-card-pic" />
        <span class="city-card-shade" aria-hidden="true"></span>
        <span class="city-card-text" aria-hidden="true">
          <span class="city-card-name">{city.name}</span>
          {city.localName ? (
            <span class="city-card-local" lang={city.localLang ?? undefined}>
              {city.localName}
            </span>
          ) : null}
          <span class="city-card-count">{blank ? 'Coming soon' : count(picks, 'pick')}</span>
        </span>
      </a>
    </li>
  );
}

/** A horizontal, swipeable row with a heading. */
export function Rail(props: { id: string; title: string; titleHref?: string; more?: { href: string; label: string }; sub?: string; children?: Child; className?: string }): Html {
  return (
    <section class={`rail ${props.className ?? ''}`} aria-labelledby={props.id}>
      <div class="rail-head">
        <div>
          <h2 id={props.id}>{props.titleHref ? <a href={props.titleHref}>{props.title}</a> : props.title}</h2>
          {props.sub ? <p class="rail-sub">{props.sub}</p> : null}
        </div>
        <div class="rail-controls">
          {props.more ? (
            <a class="rail-more" href={props.more.href}>
              {props.more.label}
            </a>
          ) : null}
          <button type="button" class="rail-arrow" data-rail-prev="" aria-label={`Previous in ${props.title}`} disabled="">
            {raw(ARROW_LEFT)}
          </button>
          <button type="button" class="rail-arrow" data-rail-next="" aria-label={`Next in ${props.title}`}>
            {raw(ARROW_RIGHT)}
          </button>
        </div>
      </div>
      <ul class="rail-track" role="list" data-rail="">
        {props.children}
      </ul>
    </section>
  );
}

/** Category pills. They wrap instead of scrolling so no label is ever cut off. */
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
              <a class={`tab${isCurrent ? ' is-current' : ''}`} href={href(routes.list(city.id, cat))} aria-current={isCurrent ? 'page' : undefined}>
                {raw(`<svg class="tab-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${categoryGlyph(cat, 'currentColor')}</svg>`)}
                <span class="tab-long">{CATEGORY_COPY[cat].label}</span>
                <span class="tab-short" aria-hidden="true">{CATEGORY_COPY[cat].short}</span>
                {cat !== 'events' && n > 0 ? <span class="tab-count">{n}</span> : null}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The photo-led header of a city's guide. */
export function CityHero(props: { city: City; photo: Photo | undefined; compact?: boolean; heading?: 'h1' | 'span'; total?: number }): Html {
  const { city } = props;
  return (
    <header class={`city-hero${props.compact ? ' city-hero-compact' : ''}`} style={`--accent:${city.accent};--accent-ink:${city.accentInk}`}>
      <Pic photo={props.photo} city={city} uid={`hero-${city.id}${props.compact ? '-c' : ''}`} alt="" sizes="100vw" eager className="city-hero-pic" credit={!props.compact} />
      <span class="city-hero-shade" aria-hidden="true"></span>
      <div class="city-hero-text">
        {props.compact ? (
          <a class="city-hero-back" href={href(routes.city(city.id))}>
            <CityName city={city} />
          </a>
        ) : (
          <>
            <p class="city-hero-country">{city.country}</p>
            <CityName city={city} tag={props.heading ?? 'h1'} />
            <p class="city-hero-tagline">{city.tagline}</p>
            {props.total ? <p class="city-hero-count">{count(props.total, 'verified pick')}</p> : null}
          </>
        )}
      </div>
    </header>
  );
}

const ARROW_LEFT = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ARROW_RIGHT = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const CHECK_ICON = `<svg class="icon icon-check" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function Stamp(props: { date: string }): Html {
  return raw(`<span class="stamp">${stampSvg(dateLabel(props.date), 'currentColor')}</span>`);
}

export function EmptyPage(props: { title: string; body: string; glyph: CategoryId; children?: Child }): Html {
  return (
    <section class="empty-page">
      {raw(`<svg class="empty-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${categoryGlyph(props.glyph, 'currentColor', 1.2)}</svg>`)}
      <h2>{props.title}</h2>
      {props.body ? <p>{props.body}</p> : null}
      {props.children ?? null}
    </section>
  );
}

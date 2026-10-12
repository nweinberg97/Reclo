import { raw, type Html } from '#jsx/jsx-runtime';
import type { CategoryId, City, EventsFile, StaticCategoryId } from '../../schema/types.ts';
import { LIST_SIZE, STATIC_CATEGORIES } from '../../schema/types.ts';
import type { Content, RankedList } from '../../lib/content.ts';
import { listKey } from '../../lib/content.ts';
import { photoKey } from '../../lib/photos.ts';
import type { RankedEntry } from '../../ranking/rank.ts';
import { Layout, SEARCH_ICON } from '../components/Layout.tsx';
import { CHECK_ICON, CityCard, CityHero, Credit, EmptyPage, Pic, PlaceCard, Rail, RankTag, SaveButton, Stamp, Tabs, imgSrc } from '../components/ui.tsx';
import { CATEGORY_COPY, COPY } from '../copy.ts';
import { SITE, absolute, href } from '../config.ts';
import { routes } from '../routes.ts';
import { count, dateLabel, eventTimeLabel, hostname, priceLabel } from '../format.ts';
import { categoryGlyph } from '../art.ts';

export function countsFor(content: Content, city: City): Record<CategoryId, number> {
  const c = {} as Record<CategoryId, number>;
  for (const cat of STATIC_CATEGORIES) c[cat] = content.lists.get(listKey(city.id, cat))!.picks.length;
  c.events = content.events.get(city.id)?.events.length ?? 0;
  return c;
}

export function totalPicks(content: Content, city: City): number {
  return STATIC_CATEGORIES.reduce((n, cat) => n + content.lists.get(listKey(city.id, cat))!.picks.length, 0);
}

const pickPhoto = (content: Content, city: City, cat: CategoryId, id: string) => content.photos.get(photoKey.pick(city.id, cat, id));
const cityPhoto = (content: Content, city: City) => content.photos.get(photoKey.city(city.id));

/** Interleaves the top picks of each city so a rail feels like a tour, not a list. */
function interleave(content: Content, cat: StaticCategoryId, perCity: number) {
  const lists = content.cities.map((c) => content.lists.get(listKey(c.id, cat))!).filter((l) => l.picks.length);
  const out: { list: RankedList; p: RankedEntry }[] = [];
  for (let i = 0; i < perCity; i++) for (const l of lists) if (l.picks[i]) out.push({ list: l, p: l.picks[i]! });
  return out;
}

// --- Home -----------------------------------------------------------------

export function HomePage(props: { content: Content }): Html {
  const { content } = props;
  const ready = content.cities.filter((c) => totalPicks(content, c) > 0);
  const soon = content.cities.filter((c) => totalPicks(content, c) === 0);
  const ordered = [...ready, ...soon];
  // Hero slides: cities with photos, finished cities first.
  const slides = ordered.filter((c) => cityPhoto(content, c)).slice(0, 6);
  const firsts = STATIC_CATEGORIES.flatMap((cat) => ready.map((c) => ({ list: content.lists.get(listKey(c.id, cat))! }))).filter((x) => x.list.picks[0]);
  return (
    <Layout
      meta={{
        description: COPY.intro,
        path: routes.home(),
        ogImage: routes.ogHome(),
        ogImageAlt: 'Reclo: the best of every city, with the receipts.',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Reclo',
          url: absolute(''),
          potentialAction: { '@type': 'SearchAction', target: `${absolute('search/')}?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
        },
      }}
      bodyClass="page-home"
    >
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-media" aria-hidden={slides.length ? undefined : 'true'} style={`--n:${Math.max(slides.length, 1)}`}>
          {slides.length ? (
            slides.map((c, i) => {
              const ph = cityPhoto(content, c)!;
              return (
                <figure class="hero-slide" style={`--i:${i};--ph:${ph.color}`}>
                  <img
                    src={imgSrc(ph.file)}
                    srcset={`${imgSrc(ph.small)} 720w, ${imgSrc(ph.file)} 1600w`}
                    sizes="100vw"
                    alt={`${c.name}`}
                    width={ph.width}
                    height={ph.height}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    fetchpriority={i === 0 ? 'high' : undefined}
                    decoding="async"
                  />
                  <figcaption class="hero-caption">
                    <a href={href(routes.city(c.id))}>{c.name}</a>
                    <a class="hero-credit" href={ph.sourceUrl} rel="noopener">
                      Photo: {ph.credit}
                      {ph.license ? `, ${ph.license}` : ''}
                    </a>
                  </figcaption>
                </figure>
              );
            })
          ) : (
            <div class="hero-mesh">
              {ordered.map((c, i) => (
                <span style={`--c:${c.accent};--i:${i}`}></span>
              ))}
            </div>
          )}
          <span class="hero-shade"></span>
        </div>
        <div class="hero-content">
          <h1 id="hero-title" class="hero-title">
            The best of every city, <span class="hl">with the receipts.</span>
          </h1>
          <p class="hero-intro">{COPY.intro}</p>
          <form class="hero-search" action={href(routes.search())} method="get" role="search" data-search-open="">
            <label class="visually-hidden" for="hero-q">
              {COPY.searchLabel}
            </label>
            {raw(SEARCH_ICON)}
            <input id="hero-q" name="q" type="search" placeholder="Where to? Try “pizza” or “Toronto”" autocomplete="off" />
            <button type="submit" class="btn btn-pop">
              Search
            </button>
          </form>
          <ul class="hero-chips" role="list">
            {ready.map((c) => (
              <li>
                <a class="chip" href={href(routes.city(c.id))} style={`--accent:${c.accent};--accent-ink:${c.accentInk}`}>
                  {c.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Rail id="cities-title" title={COPY.shelfTitle} sub={`${ready.length} cities ready, ${soon.length} on the way.`} className="rail-cities">
        {ordered.map((c, i) => (
          <CityCard city={c} picks={totalPicks(content, c)} photo={cityPhoto(content, c)} eager={i < 3} />
        ))}
      </Rail>

      <Rail id="ones-title" title={COPY.numberOnes} sub={COPY.numberOnesSub}>
        {firsts.map(({ list }) => (
          <PlaceCard city={list.city} category={list.category} p={list.picks[0]!} photo={pickPhoto(content, list.city, list.category, list.picks[0]!.entry.id)} showCity />
        ))}
      </Rail>

      <section class="promises" aria-label="What Reclo promises">
        <ul role="list">
          {COPY.promises.map((p, i) => (
            <li class={`promise promise-${i + 1}`}>
              {raw(`<svg class="promise-icon" viewBox="0 0 24 24" aria-hidden="true">${PROMISE_ICONS[i]}</svg>`)}
              <h2>{p.title}</h2>
              <p>{p.body}</p>
            </li>
          ))}
        </ul>
        <p class="promises-more">
          <a href={href(routes.ranks())}>See exactly how Reclo ranks</a>
        </p>
      </section>

      {STATIC_CATEGORIES.map((cat) => {
        const items = interleave(content, cat, 3);
        if (!items.length) return raw('');
        const title = cat === 'restaurants' ? 'Where to eat' : cat === 'hotels' ? 'Where to stay' : 'What to do';
        return (
          <Rail id={`rail-${cat}`} title={title} sub={CATEGORY_COPY[cat].blurb}>
            {items.map(({ list, p }) => (
              <PlaceCard city={list.city} category={cat} p={p} photo={pickPhoto(content, list.city, cat, p.entry.id)} showCity />
            ))}
          </Rail>
        );
      })}
    </Layout>
  );
}

const PROMISE_ICONS = [
  '<path d="M6 3h9l3 3v15H6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 10h6M9 14h6M9 18h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5.6 5.6l12.8 12.8" stroke="currentColor" stroke-width="2"/><path d="M12 7v10M9.5 9.5c0-1 1-1.6 2.5-1.6s2.5.7 2.5 1.7-1 1.4-2.5 1.7-2.5.7-2.5 1.7 1 1.7 2.5 1.7 2.5-.6 2.5-1.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
];

// --- City -------------------------------------------------------------------

export function CityPage(props: { content: Content; city: City }): Html {
  const { content, city } = props;
  const counts = countsFor(content, city);
  const total = totalPicks(content, city);
  return (
    <Layout
      meta={{
        title: `The best of ${city.name}`,
        description: total
          ? `Where to eat, stay and go in ${city.name}: ${count(total, 'pick')}, each backed by independent reviews and awards. Free, with no ads and no paid placement.`
          : `Reclo's ${city.name} guide is on its way. Every pick will be backed by independent sources.`,
        path: routes.city(city.id),
        ogImage: routes.ogPage(routes.city(city.id)),
        ogImageAlt: `The best of ${city.name}, on Reclo`,
        accent: city.accent,
        accentInk: city.accentInk,
      }}
    >
      <CityHero city={city} photo={cityPhoto(content, city)} total={total} />
      <div class="page">
        <Tabs city={city} counts={counts} />
        {STATIC_CATEGORIES.map((cat) => {
          const list = content.lists.get(listKey(city.id, cat))!;
          const c = CATEGORY_COPY[cat];
          if (!list.picks.length) {
            return (
              <section class="rail" aria-labelledby={`rail-${cat}`}>
                <div class="rail-head">
                  <h2 id={`rail-${cat}`}>{c.label}</h2>
                </div>
                <p class="soon-note">{COPY.researchingTitle}. We’d rather show nothing than guess.</p>
              </section>
            );
          }
          return (
            <Rail
              id={`rail-${cat}`}
              title={c.label}
              titleHref={href(routes.list(city.id, cat))}
              sub={c.blurb}
              more={{ href: href(routes.list(city.id, cat)), label: `See all ${list.picks.length}` }}
            >
              {list.picks.slice(0, 10).map((p, i) => (
                <PlaceCard city={city} category={cat} p={p} photo={pickPhoto(content, city, cat, p.entry.id)} eager={i < 2} />
              ))}
            </Rail>
          );
        })}
        <EventsPreview city={city} events={content.events.get(city.id)!} />
        <TellUs subject={`${city.name} guide`} />
      </div>
    </Layout>
  );
}

function EventsPreview(props: { city: City; events: EventsFile }): Html {
  const upcoming = props.events.events.slice(0, 4);
  return (
    <section class="rail" aria-labelledby="rail-events">
      <div class="rail-head">
        <h2 id="rail-events">
          <a href={href(routes.list(props.city.id, 'events'))}>{CATEGORY_COPY.events.label}</a>
        </h2>
      </div>
      {upcoming.length ? (
        <ul class="event-list" data-events="">
          {upcoming.map((e) => (
            <EventRow e={e} />
          ))}
        </ul>
      ) : (
        <p class="soon-note">{props.events.source ? COPY.eventsNoneThisWeek : COPY.eventsEmptyBody}</p>
      )}
    </section>
  );
}

// --- Lists ------------------------------------------------------------------

export function ListPage(props: { content: Content; list: RankedList }): Html {
  const { content, list } = props;
  const { city } = list;
  const cat = CATEGORY_COPY[list.category];
  const n = list.picks.length;
  const title = `${n ? `The ${n} best` : 'The best'} ${cat.phrase} in ${city.name}`;
  return (
    <Layout
      meta={{
        title: n ? `Best ${cat.phrase} in ${city.name}` : `${cat.label} in ${city.name}`,
        description: n
          ? `${title}, ranked by independent reviews and awards: ${list.picks
              .slice(0, 3)
              .map((p) => p.entry.name)
              .join(', ')} and more. No ads, no paid placement.`
          : `Reclo's list of ${cat.phrase} in ${city.name} is on its way.`,
        path: routes.list(city.id, list.category),
        ogImage: routes.ogPage(routes.list(city.id, list.category)),
        ogImageAlt: `${cat.label} in ${city.name}, on Reclo`,
        accent: city.accent,
        accentInk: city.accentInk,
        jsonLd: n
          ? {
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: title,
              itemListOrder: 'https://schema.org/ItemListOrderAscending',
              numberOfItems: n,
              itemListElement: list.picks.map((p) => ({
                '@type': 'ListItem',
                position: p.rank,
                name: p.entry.name,
                url: absolute(routes.pick(city.id, list.category, p.entry.id)),
              })),
            }
          : undefined,
      }}
    >
      <CityHero city={city} photo={cityPhoto(content, city)} compact />
      <div class="page">
        <Tabs city={city} current={list.category} counts={countsFor(content, city)} />
        <header class="list-head">
          <h1>
            {cat.label} in {city.name}
          </h1>
          <p class="list-blurb">{cat.blurb}</p>
          {n ? (
            <p class="list-meta">
              Ranked by independent reviews and awards. Updated {dateLabel(list.updated!)}. <a href={href(routes.ranks())}>How we rank</a>
            </p>
          ) : null}
        </header>
        {n ? (
          <>
            {n < LIST_SIZE ? <p class="note">{COPY.shortList(n)}</p> : null}
            <ol class="place-grid" role="list">
              {list.picks.map((p, i) => (
                <PlaceCard city={city} category={list.category} p={p} photo={pickPhoto(content, city, list.category, p.entry.id)} eager={i < 3} />
              ))}
            </ol>
            <div class="share-row share-row-list">
              <button
                type="button"
                class="btn btn-pop"
                data-share=""
                data-share-url={absolute(routes.list(city.id, list.category))}
                data-share-title={`${cat.label} in ${city.name} · Reclo`}
                data-share-text={`The best ${cat.phrase} in ${city.name}, with the receipts.`}
              >
                Share this list
              </button>
            </div>
          </>
        ) : (
          <EmptyPage title={COPY.researchingTitle} body={COPY.researchingBody} glyph={list.category}>
            <OtherCities content={content} except={city} />
          </EmptyPage>
        )}
        <TellUs subject={`${cat.label} in ${city.name}`} />
      </div>
    </Layout>
  );
}

function OtherCities(props: { content: Content; except: City }): Html {
  const ready = props.content.cities.filter((c) => c.id !== props.except.id && totalPicks(props.content, c) > 0);
  if (!ready.length) return raw('');
  return (
    <ul class="hero-chips hero-chips-center" role="list">
      {ready.map((c) => (
        <li>
          <a class="chip" href={href(routes.city(c.id))} style={`--accent:${c.accent};--accent-ink:${c.accentInk}`}>
            {c.name}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function EventsPage(props: { content: Content; city: City }): Html {
  const { content, city } = props;
  const file = content.events.get(city.id)!;
  const has = file.events.length > 0;
  return (
    <Layout
      meta={{
        title: `This week in ${city.name}`,
        description: `Concerts and local events in ${city.name} over the next seven days, from calendars Reclo trusts.`,
        path: routes.list(city.id, 'events'),
        ogImage: routes.ogPage(routes.list(city.id, 'events')),
        ogImageAlt: `This week in ${city.name}, on Reclo`,
        accent: city.accent,
        accentInk: city.accentInk,
      }}
    >
      <CityHero city={city} photo={cityPhoto(content, city)} compact />
      <div class="page">
        <Tabs city={city} current="events" counts={countsFor(content, city)} />
        <header class="list-head">
          <h1>This week in {city.name}</h1>
          <p class="list-blurb">{CATEGORY_COPY.events.blurb}</p>
        </header>
        {has ? (
          <>
            <ul class="event-list" data-events="">
              {file.events.map((e) => (
                <EventRow e={e} />
              ))}
            </ul>
            <p class="events-none" hidden="" data-events-none="">
              {COPY.eventsNoneThisWeek}
            </p>
            <p class="list-meta">
              Times are local to {city.name}. From {file.sourceUrl ? <a href={file.sourceUrl}>{file.sourceName}</a> : file.sourceName}
              {file.fetchedAt ? `, refreshed ${dateLabel(file.fetchedAt.slice(0, 10))}` : ''}. Book on the organiser’s site; Reclo never sells tickets.
            </p>
          </>
        ) : (
          <EmptyPage title={file.source ? COPY.eventsNoneThisWeek : COPY.eventsEmptyTitle} body={file.source ? '' : COPY.eventsEmptyBody} glyph="events">
            {totalPicks(content, city) ? (
              <p class="empty-next">
                Meanwhile, the <a href={href(routes.list(city.id, 'things-to-do'))}>things to do in {city.name}</a> are always on.
              </p>
            ) : null}
          </EmptyPage>
        )}
        <TellUs subject={`Events in ${city.name}`} />
      </div>
    </Layout>
  );
}

function EventRow(props: { e: EventsFile['events'][number] }): Html {
  const { e } = props;
  const t = eventTimeLabel(e.startsAt);
  return (
    <li class="event-row" data-ends={e.endsAt ?? new Date(Date.parse(e.startsAt) + 3 * 3600_000).toISOString()}>
      <time class="event-when" datetime={e.startsAt}>
        <span class="event-day">{t.day}</span>
        <span class="event-time">{t.time}</span>
      </time>
      <span class="event-body">
        <a class="event-name" href={e.url} rel="noopener">
          {e.name}
        </a>
        <span class="event-venue">
          {e.venue}
          {e.kind ? `, ${e.kind.toLowerCase()}` : ''}
        </span>
      </span>
    </li>
  );
}

// --- Pick -------------------------------------------------------------------

export function PickPage(props: { content: Content; list: RankedList; p: RankedEntry; prev: RankedEntry | null; next: RankedEntry | null }): Html {
  const { content, list, p, prev, next } = props;
  const { city } = list;
  const e = p.entry;
  const cat = CATEGORY_COPY[list.category];
  const pride = `#${p.rank} ${cat.singular} in ${city.name}`;
  const path = routes.pick(city.id, list.category, e.id);
  const price = priceLabel(e.price);
  const sources = e.evidence.map((ev) => content.sources.get(ev.source)!);
  const photo = pickPhoto(content, city, list.category, e.id);
  const placeType = list.category === 'hotels' ? 'Hotel' : list.category === 'restaurants' ? 'Restaurant' : 'TouristAttraction';
  const removeUrl = `${SITE.feedbackUrl}?title=${encodeURIComponent(`Photo removal: ${e.name} (${city.name})`)}`;
  return (
    <Layout
      meta={{
        title: `${e.name}, ${pride}`,
        description: `${e.description} ${e.why} Backed by ${sources.map((s) => s.name).join(', ')}.`,
        path,
        ogImage: routes.ogPage(path),
        ogImageAlt: `${e.name}: ${pride}, on Reclo`,
        accent: city.accent,
        accentInk: city.accentInk,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': placeType,
          name: e.name,
          description: e.description,
          ...(e.website ? { url: e.website } : {}),
          ...(e.address ? { address: e.address } : {}),
          ...(photo ? { image: absolute(`img/${photo.file}`) } : {}),
          ...(e.price !== null && e.price > 0 && list.category !== 'things-to-do' ? { priceRange: '$'.repeat(e.price) } : {}),
        },
      }}
      bodyClass="page-pick"
    >
      <div class="page page-pick-inner" style={`--accent:${city.accent};--accent-ink:${city.accentInk}`}>
        <nav class="crumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <a href={href(routes.city(city.id))}>{city.name}</a>
            </li>
            <li>
              <a href={href(routes.list(city.id, list.category))}>{cat.label}</a>
            </li>
            <li aria-current="page">{e.name}</li>
          </ol>
        </nav>
        <article class="pick" aria-labelledby="pick-name">
          <Pic photo={photo} city={city} category={list.category} uid={`pick-${e.id}`} alt={photo ? `${e.name}, ${city.name}` : `Illustration for ${e.name}`} sizes="(min-width: 1000px) 960px, 100vw" eager className="pick-hero" credit>
            <RankTag n={p.rank} big vt={`rank-${city.id}-${e.id}`} />
          </Pic>

          <div class="pick-layout">
            <div class="pick-main">
              <header class="pick-title">
                <div class="pick-title-row">
                  <p class="pick-pride">{pride}</p>
                  <SaveButton path={path} name={e.name} big />
                </div>
                <h1 id="pick-name">
                  {e.name}
                  {e.localName ? (
                    <span class="pick-local" lang={city.localLang ?? undefined}>
                      {e.localName}
                    </span>
                  ) : null}
                </h1>
                <p class="pick-meta">
                  {[e.neighbourhood, e.subtype].filter(Boolean).join(' · ')}
                  {price ? (
                    <>
                      {' · '}
                      <span class="price" title={price.words}>
                        <span aria-hidden="true">{price.short}</span>
                        <span class="visually-hidden">{price.words}</span>
                      </span>
                    </>
                  ) : null}
                </p>
              </header>
              <p class="pick-desc">{e.description}</p>

              <section class="pick-why" aria-labelledby="why-h">
                <h2 id="why-h">{COPY.whyHeading}</h2>
                <p class="why-line">{e.why}</p>
              </section>

              {e.note ? <p class="note">{e.note}</p> : null}

              <section class="receipts" aria-labelledby="receipts-h">
                <div class="receipts-head">
                  <div>
                    <h2 id="receipts-h">{COPY.receiptsHeading}</h2>
                    <p>{COPY.receiptsIntro}</p>
                  </div>
                  <Stamp date={e.lastVerified} />
                </div>
                <ol class="receipt-list" role="list">
                  {e.evidence.map((ev, i) => {
                    const src = sources[i]!;
                    return (
                      <li class="receipt">
                        <span class="receipt-source">{src.name}</span>
                        <span class="receipt-says">{ev.supports}</span>
                        <a class="receipt-title" href={ev.url} rel="noopener">
                          {ev.title}
                        </a>
                        <span class="receipt-meta">
                          {ev.published ? `Published ${dateLabel(ev.published)}` : 'Undated page'}
                          {` · checked ${dateLabel(ev.checked)}`}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </section>
            </div>

            <aside class="pick-side" aria-label="Plan your visit">
              <section class="practical" aria-labelledby="prac-h">
                <h2 id="prac-h">{COPY.practicalHeading}</h2>
                <dl>
                  {e.neighbourhood ? (
                    <>
                      <dt>Neighbourhood</dt>
                      <dd>{e.neighbourhood}</dd>
                    </>
                  ) : null}
                  {e.address ? (
                    <>
                      <dt>Address</dt>
                      <dd>
                        <a href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${e.address}, ${city.name}`)}`} rel="noopener">
                          {e.address}
                        </a>
                      </dd>
                    </>
                  ) : null}
                  {price ? (
                    <>
                      <dt>Price</dt>
                      <dd>
                        {price.short} <span class="dd-hint">({price.words.toLowerCase()})</span>
                      </dd>
                    </>
                  ) : null}
                  <dt>Last checked</dt>
                  <dd>{dateLabel(e.lastVerified)}</dd>
                </dl>
                {e.website ? (
                  <a class="btn btn-pop btn-block" href={e.website} rel="noopener">
                    {list.category === 'hotels' ? 'Book with the hotel' : `Visit ${hostname(e.website)}`}
                  </a>
                ) : null}
              </section>

              <section class="share" aria-labelledby="share-h">
                <h2 id="share-h">{COPY.shareHeading}</h2>
                <div class="share-row">
                  <a
                    class="btn btn-pop"
                    href={href(routes.card(city.id, list.category, e.id, 'story'))}
                    download={`reclo-${city.id}-${e.id}-story.png`}
                    data-share-story={href(routes.card(city.id, list.category, e.id, 'story'))}
                    data-share-url={absolute(path)}
                    data-share-title={`${e.name} · Reclo`}
                  >
                    {COPY.storyCard}
                  </a>
                  <button type="button" class="btn btn-quiet" data-share="" data-share-url={absolute(path)} data-share-title={`${e.name} · Reclo`} data-share-text={`${pride}, with the receipts:`}>
                    {COPY.shareLink}
                  </button>
                </div>
                <img
                  class="story-preview"
                  src={href(routes.card(city.id, list.category, e.id, 'story'))}
                  alt={`Story image for ${e.name}: the photo, ${pride}, and why it's here.`}
                  width="1080"
                  height="1920"
                  loading="lazy"
                  decoding="async"
                />
                <details class="made-list">
                  <summary>{COPY.madeTheList}</summary>
                  <p>{COPY.madeTheListBody}</p>
                  <img src={href(routes.card(city.id, list.category, e.id, 'badge'))} alt={`Card reading: ${e.name}, ${pride}, on Reclo.`} width="540" height="540" loading="lazy" decoding="async" />
                  <a class="btn btn-ink" href={href(routes.card(city.id, list.category, e.id, 'badge'))} download={`reclo-${city.id}-${e.id}-made-the-list.png`}>
                    {COPY.badgeCard}
                  </a>
                </details>
              </section>
            </aside>
          </div>
        </article>

        <nav class="pager" aria-label="More from this list">
          {prev ? (
            <a class="pager-link pager-prev" href={href(routes.pick(city.id, list.category, prev.entry.id))}>
              <span class="pager-label">#{prev.rank}</span>
              <span class="pager-name">{prev.entry.name}</span>
            </a>
          ) : (
            <span></span>
          )}
          <a class="pager-up" href={href(routes.list(city.id, list.category))}>
            All {list.picks.length}
          </a>
          {next ? (
            <a class="pager-link pager-next" href={href(routes.pick(city.id, list.category, next.entry.id))}>
              <span class="pager-label">#{next.rank}</span>
              <span class="pager-name">{next.entry.name}</span>
            </a>
          ) : (
            <span></span>
          )}
        </nav>
        <TellUs subject={`${e.name} (${city.name})`} />
        {photo?.kind === 'website' ? (
          <p class="tell-us">
            <a href={removeUrl} rel="noopener">
              {COPY.removePhoto}
            </a>
          </p>
        ) : null}
      </div>

      <div class="action-bar" aria-label="Quick actions">
        <span class="action-bar-text">
          <span class="action-bar-rank">#{p.rank}</span>
          <span class="action-bar-name">{e.name}</span>
        </span>
        <SaveButton path={path} name={e.name} />
        <button type="button" class="btn btn-quiet btn-small" data-share="" data-share-url={absolute(path)} data-share-title={`${e.name} · Reclo`} data-share-text={`${pride}, with the receipts:`}>
          Share
        </button>
        {e.website ? (
          <a class="btn btn-pop btn-small" href={e.website} rel="noopener">
            {list.category === 'hotels' ? 'Book' : 'Website'}
          </a>
        ) : null}
      </div>
    </Layout>
  );
}

// --- Shared bits ---------------------------------------------------------------

export function TellUs(props: { subject: string }): Html {
  const url = SITE.feedbackUrl.includes('github.com') ? `${SITE.feedbackUrl}?title=${encodeURIComponent(`Correction: ${props.subject}`)}` : SITE.feedbackUrl;
  return (
    <p class="tell-us">
      <a href={url} rel="noopener">
        {COPY.tellUs}
      </a>
    </p>
  );
}

export { CHECK_ICON, Credit, categoryGlyph, type StaticCategoryId };

import { raw, type Html } from '#jsx/jsx-runtime';
import type { CategoryId, City, EventsFile, StaticCategoryId } from '../../schema/types.ts';
import { LIST_SIZE, STATIC_CATEGORIES } from '../../schema/types.ts';
import type { Content, RankedList } from '../../lib/content.ts';
import { listKey } from '../../lib/content.ts';
import type { RankedEntry } from '../../ranking/rank.ts';
import { Layout, SEARCH_ICON } from '../components/Layout.tsx';
import { CHECK_ICON, Cover, EmptyPage, PickArt, PickRow, Rank, ShelfNotebook, Stamp, Tabs } from '../components/Notebook.tsx';
import { CATEGORY_COPY, COPY } from '../copy.ts';
import { SITE, absolute, href } from '../config.ts';
import { routes } from '../routes.ts';
import { count, dateLabel, eventTimeLabel, hostname, priceLabel } from '../format.ts';

export function countsFor(content: Content, city: City): Record<CategoryId, number> {
  const c = {} as Record<CategoryId, number>;
  for (const cat of STATIC_CATEGORIES) c[cat] = content.lists.get(listKey(city.id, cat))!.picks.length;
  c.events = content.events.get(city.id)?.events.length ?? 0;
  return c;
}

export function totalPicks(content: Content, city: City): number {
  return STATIC_CATEGORIES.reduce((n, cat) => n + content.lists.get(listKey(city.id, cat))!.picks.length, 0);
}

// --- Home -----------------------------------------------------------------

export function HomePage(props: { content: Content }): Html {
  const { content } = props;
  const ready = content.cities.filter((c) => totalPicks(content, c) > 0);
  const shelf = [...ready, ...content.cities.filter((c) => totalPicks(content, c) === 0)];
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
          potentialAction: {
            '@type': 'SearchAction',
            target: `${absolute('search/')}?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
      }}
      bodyClass="page-home"
    >
      <section class="hero">
        <h1 class="hero-title">{COPY.tagline}</h1>
        <p class="hero-intro">{COPY.intro}</p>
        <form class="hero-search" action={href(routes.search())} method="get" role="search" data-search-open="">
          <label class="visually-hidden" for="hero-q">
            {COPY.searchLabel}
          </label>
          {raw(SEARCH_ICON)}
          <input id="hero-q" name="q" type="search" placeholder={COPY.searchPlaceholder} autocomplete="off" />
          <button type="submit" class="btn">
            Search
          </button>
        </form>
      </section>
      <section class="shelf" aria-labelledby="shelf-title">
        <h2 id="shelf-title" class="section-title">
          {COPY.shelfTitle}
        </h2>
        <ul class="shelf-list">
          {shelf.map((city, i) => (
            <ShelfNotebook city={city} picks={totalPicks(content, city)} index={i} />
          ))}
        </ul>
      </section>
      <section class="promises" aria-label="What Reclo promises">
        <ul>
          {COPY.promises.map((p) => (
            <li>
              <h2>{p.title}</h2>
              <p>{p.body}</p>
            </li>
          ))}
        </ul>
        <p class="promises-more">
          <a href={href(routes.ranks())}>Read how Reclo ranks</a>
        </p>
      </section>
    </Layout>
  );
}

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
          ? `Where to eat, stay and go in ${city.name}: ${count(total, 'pick')}, each backed by independent sources. Free, with no ads and no paid placement.`
          : `Reclo's ${city.name} notebook is being researched. Every pick will be backed by independent sources.`,
        path: routes.city(city.id),
        ogImage: routes.ogPage(routes.city(city.id)),
        ogImageAlt: `Reclo's ${city.name} notebook`,
        accent: city.accent,
        accentInk: city.accentInk,
      }}
    >
      <div class="notebook-page">
        <Cover city={city} />
        <Tabs city={city} counts={counts} />
        <div class="page-paper">
          {STATIC_CATEGORIES.map((cat) => (
            <CityPreview list={content.lists.get(listKey(city.id, cat))!} />
          ))}
          <EventsPreview city={city} events={content.events.get(city.id)!} />
          <TellUs subject={`${city.name} notebook`} />
        </div>
      </div>
    </Layout>
  );
}

function CityPreview(props: { list: RankedList }): Html {
  const { list } = props;
  const cat = CATEGORY_COPY[list.category];
  const top = list.picks.slice(0, 3);
  return (
    <section class="preview" aria-labelledby={`pv-${list.category}`}>
      <div class="preview-head">
        <h2 id={`pv-${list.category}`}>
          <a href={href(routes.list(list.city.id, list.category))}>{cat.label}</a>
        </h2>
        {list.picks.length ? (
          <a class="preview-all" href={href(routes.list(list.city.id, list.category))}>
            See all {list.picks.length}
          </a>
        ) : null}
      </div>
      {top.length ? (
        <ol class="pick-list pick-list-preview">
          {top.map((p) => (
            <PickRow city={list.city} category={list.category} p={p} />
          ))}
        </ol>
      ) : (
        <p class="preview-empty">{COPY.researchingTitle}. We’d rather leave it blank than guess.</p>
      )}
    </section>
  );
}

function EventsPreview(props: { city: City; events: EventsFile }): Html {
  const upcoming = props.events.events.slice(0, 3);
  return (
    <section class="preview" aria-labelledby="pv-events">
      <div class="preview-head">
        <h2 id="pv-events">
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
        <p class="preview-empty">{props.events.source ? COPY.eventsNoneThisWeek : COPY.eventsEmptyBody}</p>
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
          ? `${title}, ranked by independent evidence: ${list.picks
              .slice(0, 3)
              .map((p) => p.entry.name)
              .join(', ')} and more. No ads, no paid placement.`
          : `Reclo's list of ${cat.phrase} in ${city.name} is being researched.`,
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
      <div class="notebook-page">
        <Cover city={city} compact />
        <Tabs city={city} current={list.category} counts={countsFor(content, city)} />
        <div class="page-paper">
          <header class="list-head">
            <h1>{n ? `${cat.label} in ${city.name}` : `${cat.label} in ${city.name}`}</h1>
            <p class="list-blurb">{cat.blurb}</p>
            {n ? (
              <p class="list-meta">
                Ranked by the strength of independent evidence. Updated {dateLabel(list.updated!)}.{' '}
                <a href={href(routes.ranks())}>How we rank</a>
              </p>
            ) : null}
          </header>
          {n ? (
            <>
              {n < LIST_SIZE ? <p class="note note-honest">{COPY.shortList(n)}</p> : null}
              <ol class="pick-list">
                {list.picks.map((p) => (
                  <PickRow city={city} category={list.category} p={p} />
                ))}
              </ol>
              <ShareRow
                url={absolute(routes.list(city.id, list.category))}
                title={`${cat.label} in ${city.name} · Reclo`}
                text={`The best ${cat.phrase} in ${city.name}, with the receipts.`}
              />
            </>
          ) : (
            <EmptyPage title={COPY.researchingTitle} body={COPY.researchingBody} glyph={list.category}>
              <OtherNotebooks content={content} except={city} />
            </EmptyPage>
          )}
          <TellUs subject={`${cat.label} in ${city.name}`} />
        </div>
      </div>
    </Layout>
  );
}

function OtherNotebooks(props: { content: Content; except: City }): Html {
  const ready = props.content.cities.filter((c) => c.id !== props.except.id && totalPicks(props.content, c) > 0);
  if (!ready.length) return raw('');
  return (
    <p class="empty-next">
      Finished notebooks:{' '}
      {ready.map((c, i) => (
        <>
          {i > 0 ? ', ' : ''}
          <a href={href(routes.city(c.id))}>{c.name}</a>
        </>
      ))}
      .
    </p>
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
      <div class="notebook-page">
        <Cover city={city} compact />
        <Tabs city={city} current="events" counts={countsFor(content, city)} />
        <div class="page-paper">
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
            <EmptyPage
              title={file.source ? COPY.eventsNoneThisWeek : COPY.eventsEmptyTitle}
              body={file.source ? '' : COPY.eventsEmptyBody}
              glyph="events"
            >
              {totalPicks(content, city) ? (
                <p class="empty-next">
                  Meanwhile, the <a href={href(routes.list(city.id, 'things-to-do'))}>things to do in {city.name}</a> are always on.
                </p>
              ) : null}
            </EmptyPage>
          )}
          <TellUs subject={`Events in ${city.name}`} />
        </div>
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

export function PickPage(props: {
  content: Content;
  list: RankedList;
  p: RankedEntry;
  prev: RankedEntry | null;
  next: RankedEntry | null;
}): Html {
  const { content, list, p, prev, next } = props;
  const { city } = list;
  const e = p.entry;
  const cat = CATEGORY_COPY[list.category];
  const pride = `#${p.rank} ${cat.singular} in ${city.name}`;
  const path = routes.pick(city.id, list.category, e.id);
  const price = priceLabel(e.price);
  const sources = e.evidence.map((ev) => content.sources.get(ev.source)!);
  const placeType = list.category === 'hotels' ? 'Hotel' : list.category === 'restaurants' ? 'Restaurant' : 'TouristAttraction';
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
          ...(e.price !== null && e.price > 0 && list.category !== 'things-to-do' ? { priceRange: '$'.repeat(e.price) } : {}),
        },
      }}
      bodyClass="page-pick"
    >
      <div class="notebook-page">
        <Cover city={city} compact />
        <Tabs city={city} current={list.category} counts={countsFor(content, city)} />
        <div class="page-paper">
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
            <header class="pick-head">
              <div class="pick-head-art">
                {e.image ? (
                  <figure class="pick-photo">
                    <img src={e.image.src} alt={e.image.alt} width="800" height="600" loading="eager" decoding="async" />
                    <figcaption>
                      <a href={e.image.sourceUrl}>{e.image.credit}</a>, {e.image.license}
                    </figcaption>
                  </figure>
                ) : (
                  <PickArt city={city} category={list.category} id={e.id} name={e.name} />
                )}
                <Rank n={p.rank} size="hero" vt={`rank-${e.id}`} />
              </div>
              <div class="pick-title">
                <p class="pick-pride">{pride}</p>
                <h1 id="pick-name">
                  {e.name}
                  {e.localName ? (
                    <span class="pick-local" lang={city.localLang ?? undefined}>
                      {e.localName}
                    </span>
                  ) : null}
                </h1>
                <p class="pick-meta">
                  {[e.neighbourhood, e.subtype].filter(Boolean).join(', ')}
                  {price ? (
                    <>
                      {' '}
                      <span class="price" title={price.words}>
                        <span aria-hidden="true">{price.short}</span>
                        <span class="visually-hidden">{price.words}</span>
                      </span>
                    </>
                  ) : null}
                </p>
                <p class="pick-desc">{e.description}</p>
              </div>
            </header>

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
              <ol class="receipt-list">
                {e.evidence.map((ev, i) => {
                  const src = sources[i]!;
                  return (
                    <li class="receipt">
                      <span class="receipt-source">{src.name}</span>
                      <a class="receipt-title" href={ev.url} rel="noopener">
                        {ev.title}
                      </a>
                      <span class="receipt-says">{ev.supports}</span>
                      <span class="receipt-meta">
                        {ev.published ? `Published ${dateLabel(ev.published)}` : 'Undated page'}
                        {`, read by us ${dateLabel(ev.checked)}`}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>

            <section class="practical" aria-labelledby="prac-h">
              <h2 id="prac-h">{COPY.practicalHeading}</h2>
              <dl>
                {e.website ? (
                  <>
                    <dt>Website</dt>
                    <dd>
                      <a href={e.website} rel="noopener">
                        {hostname(e.website)}
                      </a>
                      {list.category === 'hotels' ? <span class="dd-hint"> Book directly with the hotel.</span> : null}
                    </dd>
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
                {e.neighbourhood ? (
                  <>
                    <dt>Neighbourhood</dt>
                    <dd>{e.neighbourhood}</dd>
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
            </section>

            <section class="share" aria-labelledby="share-h">
              <h2 id="share-h">{COPY.shareHeading}</h2>
              <div class="share-row">
                <button
                  type="button"
                  class="btn"
                  data-share=""
                  data-share-url={absolute(path)}
                  data-share-title={`${e.name} · Reclo`}
                  data-share-text={`${pride}, with the receipts:`}
                >
                  {COPY.shareLink}
                </button>
                <a class="btn btn-quiet" href={href(routes.card(city.id, list.category, e.id, 'story'))} download={`reclo-${city.id}-${e.id}-story.png`}>
                  {COPY.storyCard}
                </a>
                <a class="btn btn-quiet" href={href(routes.card(city.id, list.category, e.id, 'post'))} download={`reclo-${city.id}-${e.id}-post.png`}>
                  {COPY.postCard}
                </a>
              </div>
              <details class="made-list">
                <summary>{COPY.madeTheList}</summary>
                <p>{COPY.madeTheListBody}</p>
                <img
                  src={href(routes.card(city.id, list.category, e.id, 'badge'))}
                  alt={`Card reading: ${e.name}, ${pride}, on Reclo.`}
                  width="540"
                  height="540"
                  loading="lazy"
                  decoding="async"
                />
                <a class="btn" href={href(routes.card(city.id, list.category, e.id, 'badge'))} download={`reclo-${city.id}-${e.id}-made-the-list.png`}>
                  {COPY.badgeCard}
                </a>
              </details>
            </section>
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
        </div>
      </div>
    </Layout>
  );
}

// --- Shared bits ---------------------------------------------------------------

function ShareRow(props: { url: string; title: string; text: string }): Html {
  return (
    <div class="share-row share-row-list">
      <button type="button" class="btn" data-share="" data-share-url={props.url} data-share-title={props.title} data-share-text={props.text}>
        Share this list
      </button>
    </div>
  );
}

export function TellUs(props: { subject: string }): Html {
  const url = SITE.feedbackUrl.includes('github.com')
    ? `${SITE.feedbackUrl}?title=${encodeURIComponent(`Correction: ${props.subject}`)}`
    : SITE.feedbackUrl;
  return (
    <p class="tell-us">
      <a href={url} rel="noopener">
        {COPY.tellUs}
      </a>
    </p>
  );
}

export { CHECK_ICON, type StaticCategoryId };

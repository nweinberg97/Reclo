import { raw, type Html } from '#jsx/jsx-runtime';
import type { Content } from '../../lib/content.ts';
import { Layout, SEARCH_ICON } from '../components/Layout.tsx';
import { COPY } from '../copy.ts';
import { SITE, href } from '../config.ts';
import { routes } from '../routes.ts';
import {
  BEFORE_VISIT_FACTOR,
  DIMINISHING,
  ECHO_WINDOW_DAYS,
  KIND_WEIGHT,
  NEIGHBOURHOOD_FREE_REPEATS,
  SAME_NEIGHBOURHOOD_PENALTY,
  SAME_SUBTYPE_PENALTY,
  SUBTYPE_FREE_REPEATS,
  TIER_WEIGHT,
  UNDATED_FACTOR,
} from '../../ranking/rank.ts';
import { LIST_SIZE, STALE_AFTER_DAYS } from '../../schema/types.ts';
import { MIN_EVIDENCE } from '../../schema/validate.ts';

const pct = (f: number) => `${Math.round((1 - f) * 100)}%`;

export function SearchPage(): Html {
  return (
    <Layout
      meta={{
        title: 'Search',
        description: 'Search Reclo for cities, places and lists.',
        path: routes.search(),
        ogImage: routes.ogHome(),
        ogImageAlt: 'Reclo',
        noindex: true,
      }}
    >
      <div class="prose-page search-page">
        <h1>Search Reclo</h1>
        <form class="hero-search" action={href(routes.search())} method="get" role="search" data-search-page="">
          <label class="visually-hidden" for="page-q">
            {COPY.searchLabel}
          </label>
          {raw(SEARCH_ICON)}
          <input id="page-q" name="q" type="search" placeholder={COPY.searchPlaceholder} autocomplete="off" data-search-input="" />
          <button type="submit" class="btn">
            Search
          </button>
        </form>
        <p class="visually-hidden" aria-live="polite" data-search-status=""></p>
        <div class="search-results search-results-page" data-search-results=""></div>
        <noscript>
          <p class="note">Search runs in your browser and needs JavaScript. You can still browse every city from the home page.</p>
        </noscript>
      </div>
    </Layout>
  );
}

export function RanksPage(props: { content: Content }): Html {
  const tiers = [1, 2, 3] as const;
  const sourcesByTier = (t: 1 | 2 | 3) =>
    [...props.content.sources.values()]
      .filter((s) => s.tier === t)
      .map((s) => s.name)
      .sort()
      .join(', ');
  return (
    <Layout
      meta={{
        title: 'How Reclo ranks',
        description: 'Reclo ranks places by the strength and independence of the evidence behind them. Nobody can pay to be listed or to move up. Here is exactly how it works.',
        path: routes.ranks(),
        ogImage: routes.ogPage(routes.ranks()),
        ogImageAlt: 'How Reclo ranks',
      }}
    >
      <article class="prose-page">
        <h1>How Reclo ranks</h1>
        <p class="lede">
          Short version: a place gets in when independent, respected sources recommend it, and it ranks higher the stronger and more independent that evidence is. Nobody can pay to be listed or to move up. Not now, not later.
        </p>

        <h2>Getting in</h2>
        <ul>
          <li>Every pick is a real place we checked against at least {MIN_EVIDENCE} independent publishers, and we opened every source ourselves.</li>
          <li>Independent means different owners: two magazines from the same company count once. A place’s own website never counts.</li>
          <li>Booking sites, review aggregators and anonymous listicles don’t count as evidence.</li>
          <li>We check for closures before publishing. Anything closed, “temporarily closed” or announced as closing stays out.</li>
          <li>Everything you read on Reclo is in our own words. Other publications are evidence, not content: we link to them and never copy their descriptions, photos or order.</li>
          <li>If we can’t verify enough places, the list is shorter. We never pad a list to reach {LIST_SIZE}.</li>
        </ul>

        <h2>The score</h2>
        <p>Each piece of evidence earns points from two things we can explain.</p>
        <h3>Who said it</h3>
        <p>We sort publishers into three tiers. This is a human judgement, made once per publisher and shown here so you can disagree with it.</p>
        <div class="table-scroll">
        <table class="rank-table">
          <thead>
            <tr>
              <th scope="col">Tier</th>
              <th scope="col">Points</th>
              <th scope="col">Publishers we currently use</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <tr>
                <th scope="row">{['', 'Awards and lead critics', 'Respected guides', 'Local press, roundups, tourism boards'][t]}</th>
                <td>{TIER_WEIGHT[t]}</td>
                <td>{sourcesByTier(t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <h3>What kind of recommendation it is</h3>
        <p>
          An award counts {KIND_WEIGHT.award}×, a critic’s review {KIND_WEIGHT.critic}×, a guide entry {KIND_WEIGHT.guide}×, a roundup or local news piece {KIND_WEIGHT.list}×, and a tourism board or institution {KIND_WEIGHT.tourism}× (they have reasons to be nice).
        </p>
        <h3>Freshness</h3>
        <p>Evidence from the last 18 months counts in full. Older evidence still counts, just less: 85% up to three years, 70% up to five, 55% beyond. Undated guide pages count {Math.round(UNDATED_FACTOR * 100)}%.</p>
        <h3>Independence</h3>
        <p>
          Only the strongest piece from each publisher group counts, and each extra independent voice adds a little less than the one before ({DIMINISHING.map((d) => `${Math.round(d * 100)}%`).join(', ')}). Ten articles from one outlet can’t outweigh three outlets that agree.
        </p>

        <h2>The hype filter</h2>
        <ul>
          <li>Pieces not written after an actual visit (opening announcements, pre-opening buzz, press releases) count for {Math.round(BEFORE_VISIT_FACTOR * 100)}%.</li>
          <li>When several of those land within {ECHO_WINDOW_DAYS} days of each other, we treat them as one press push and count only the strongest.</li>
        </ul>

        <h2>Keeping lists varied</h2>
        <p>
          A top {LIST_SIZE} shouldn’t be {LIST_SIZE} versions of the same thing. We fill the list from the top, and after the first {SUBTYPE_FREE_REPEATS} picks of any one style (say, tasting menus or museums), each further one needs about {pct(SAME_SUBTYPE_PENALTY)} more evidence to get in. After {NEIGHBOURHOOD_FREE_REPEATS} picks in one neighbourhood, each further one needs about {pct(SAME_NEIGHBOURHOOD_PENALTY)} more. Strong evidence still wins; it just has to be stronger.
        </p>
        <p>When two places score exactly the same, the one with more independent sources goes first, then the one with fresher evidence.</p>

        <h2>Where judgement comes in</h2>
        <p>
          The maths is code, tested and public. The judgement is in choosing which publishers to trust and how much, deciding whether a piece was written after a visit, and writing the one-line “why it’s here”. Those calls are recorded alongside every pick, and you can see them in the{' '}
          <a href={SITE.repoUrl}>project’s files</a>.
        </p>
        <h2>Keeping it true</h2>
        <ul>
          <li>Every pick shows the date we last checked it. Anything not re-checked within {Math.round(STALE_AFTER_DAYS / 30)} months is flagged for a fresh look.</li>
          <li>A weekly job checks every source link and every official website, and flags any that break.</li>
          <li>
            If something is wrong, closed or missing, <a href={SITE.feedbackUrl}>tell us</a>. We read every note.
          </li>
        </ul>
        <h2>What we will never do</h2>
        <p>Sell placement, accept payment to be listed, run ads, or track you. Being on Reclo can’t be bought. That’s the whole point.</p>
      </article>
    </Layout>
  );
}

export function PrivacyPage(): Html {
  return (
    <Layout
      meta={{
        title: 'Privacy',
        description: 'Reclo collects no personal data: no accounts, no cookies, no analytics, no tracking.',
        path: routes.privacy(),
        ogImage: routes.ogHome(),
        ogImageAlt: 'Reclo',
      }}
    >
      <article class="prose-page">
        <h1>Privacy</h1>
        <p class="lede">Reclo collects nothing about you. That’s the whole policy; here are the details.</p>
        <ul>
          <li>No accounts, no sign-up, no email capture.</li>
          <li>No cookies, no analytics, no advertising or tracking scripts, and no third-party fonts or embeds. Every file comes from this site.</li>
          <li>Search runs entirely in your browser. What you type never leaves your device.</li>
          <li>If you choose light or dark mode, that choice is saved in your own browser so it sticks. It never reaches us, and clearing site data removes it.</li>
          <li>
            The site is hosted on GitHub Pages. Like any web host, GitHub may keep standard server logs (such as IP addresses) for security; see{' '}
            <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub’s privacy statement</a>. Reclo doesn’t see or use them.
          </li>
          <li>Links to websites, sources and maps take you to other sites with their own policies.</li>
        </ul>
        <p>
          Questions? <a href={SITE.feedbackUrl}>Tell us</a>.
        </p>
      </article>
    </Layout>
  );
}

export function NotFoundPage(): Html {
  return (
    <Layout
      meta={{
        title: 'Page not found',
        description: 'This page isn’t on Reclo.',
        path: '404.html',
        ogImage: routes.ogHome(),
        ogImageAlt: 'Reclo',
        noindex: true,
      }}
    >
      <div class="prose-page not-found">
        <p class="not-found-mark" aria-hidden="true">
          404
        </p>
        <h1>This page isn’t on Reclo</h1>
        <p>It may have moved, or the place may have closed. Try a search, or start from the shelf.</p>
        <form class="hero-search" action={href(routes.search())} method="get" role="search">
          <label class="visually-hidden" for="nf-q">
            {COPY.searchLabel}
          </label>
          {raw(SEARCH_ICON)}
          <input id="nf-q" name="q" type="search" placeholder={COPY.searchPlaceholder} autocomplete="off" />
          <button type="submit" class="btn">
            Search
          </button>
        </form>
        <p>
          <a href={href('')}>Back to the shelf</a>
        </p>
      </div>
    </Layout>
  );
}

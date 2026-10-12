import { raw, type Html } from '#jsx/jsx-runtime';
import type { Content } from '../../lib/content.ts';
import { Layout, MIC_ICON, SEARCH_ICON } from '../components/Layout.tsx';
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
        <h1 data-search-heading="">Search Reclo</h1>
        <form class="hero-search" action={href(routes.search())} method="get" role="search" data-search-page="">
          <label class="visually-hidden" for="page-q">
            {COPY.searchLabel}
          </label>
          {raw(SEARCH_ICON)}
          <input id="page-q" name="q" type="search" placeholder={COPY.searchPlaceholder} autocomplete="off" data-search-input="" />
          <button type="button" class="icon-btn mic-btn" data-voice="" aria-label="Search by voice" hidden="">
            {raw(MIC_ICON)}
          </button>
          <button type="submit" class="btn btn-pop">
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

        <h2>How the research is done</h2>
        <p>
          Reclo’s lists are researched with AI, following a published research brief: find places that independent, respected sources recommend, open and read every source, check for closures, and write everything in Reclo’s own words. The order is then calculated by the method below, in code anyone can read.
        </p>
        <p>Nothing on Reclo is hand-picked by a person yet. When human curators join, their recommendations will be clearly labelled as theirs.</p>

        <h2>Getting in</h2>
        <ul>
          <li>Every pick is a real place backed by at least {MIN_EVIDENCE} independent publishers, and every source was opened and read during research.</li>
          <li>Independent means different owners: two magazines from the same company count once. A place’s own website never counts.</li>
          <li>Booking sites, review aggregators and anonymous listicles don’t count as evidence.</li>
          <li>Each place is checked for signs of closing before it’s published. Anything closed, “temporarily closed” or announced as closing stays out.</li>
          <li>Everything you read on Reclo is written for Reclo. Other publications are evidence, not content: we link to them and never copy their descriptions, photos or order.</li>
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
            If something is wrong, closed or missing, <a href={SITE.feedbackUrl}>tell us</a>. Notes go straight to the Reclo team.
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
          <li>Places you save, and your light or dark mode choice, are stored in your own browser so they stick. They never reach us, and clearing site data removes them.</li>
          <li>
            Voice search is optional. When you tap the microphone, your browser’s own speech service turns what you say into text; depending on your browser that may happen on your device or on its maker’s servers (for example Google for Chrome, Apple for Safari). Reclo only receives the text, and only inside your browser.
          </li>
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

export function SavedPage(): Html {
  return (
    <Layout
      meta={{
        title: 'Saved',
        description: 'Places you’ve saved on Reclo, side by side.',
        path: routes.saved(),
        ogImage: routes.ogHome(),
        ogImageAlt: 'Reclo',
        noindex: true,
      }}
      bodyClass="page-saved"
    >
      <div class="page saved-page">
        <header class="list-head">
          <h1>Saved</h1>
          <p class="list-blurb">Your shortlist. Compare them side by side, then pick one.</p>
          <p class="list-meta">Saved on this device only. Nothing is sent anywhere, and there’s no account.</p>
        </header>
        <div class="saved-toolbar" data-saved-toolbar="" hidden="">
          <div class="segmented" role="group" aria-label="View">
            <button type="button" class="seg is-on" data-view="cards" aria-pressed="true">
              Cards
            </button>
            <button type="button" class="seg" data-view="compare" aria-pressed="false">
              Compare
            </button>
          </div>
          <button type="button" class="text-btn" data-saved-clear="">
            Clear all
          </button>
        </div>
        <div data-saved-root="">
          <noscript>
            <p class="note">Saving places needs JavaScript.</p>
          </noscript>
        </div>
      </div>
    </Layout>
  );
}

export function CuratorsPage(props: { content: Content }): Html {
  const total = [...props.content.lists.values()].reduce((n, l) => n + l.picks.length, 0);
  return (
    <Layout
      meta={{
        title: 'Become a Reclo curator',
        description: 'Love a city? Become a Reclo curator: vouch for the places you’d send your friends, under your own name. Creators especially welcome.',
        path: routes.curators(),
        ogImage: routes.ogPage(routes.curators()),
        ogImageAlt: 'Become a Reclo curator',
      }}
      bodyClass="page-curators"
    >
      <section class="curator-hero">
        <div class="curator-hero-inner">
          <p class="curator-kicker">Curators, wanted</p>
          <h1>Know a city by heart? Put your name on it.</h1>
          <p class="curator-intro">
            Reclo’s {total} picks are researched with AI and backed by independent sources. Next, we want people: locals, creators and obsessives who’ve actually been, adding their own verified recommendations under their own name.
          </p>
          <a class="btn btn-pop" href={SITE.curatorUrl} rel="noopener">
            Apply to be a curator
          </a>
          <p class="curator-fine">Anyone can apply. Creators with an audience who trusts their taste are especially welcome.</p>
        </div>
      </section>

      <div class="prose-page curator-body">
        <h2>What curators get</h2>
        <ul class="curator-perks" role="list">
          <li>
            <strong>Your name on your picks.</strong> A “Curated by” credit and a profile linking to your channels.
          </li>
          <li>
            <strong>A home for your best recommendations.</strong> One link to send people instead of answering the same DMs every week.
          </li>
          <li>
            <strong>Early access.</strong> Help shape how curator reviews work before they launch.
          </li>
        </ul>

        <h2>What we ask</h2>
        <ul>
          <li>You’ve been to the places you recommend, recently.</li>
          <li>You tell us if you’ve been paid, gifted or comped by a place, and that place can’t appear in your picks. Rankings are never for sale, and that includes yours.</li>
          <li>Your words are your own, and you’re fine with them being checked against the evidence.</li>
        </ul>

        <h2>How it works</h2>
        <ol class="curator-steps">
          <li>
            <strong>Apply</strong> with your city, your links and three places you’d send a friend.
          </li>
          <li>
            <strong>Get verified.</strong> We confirm who you are and that your picks are real and current.
          </li>
          <li>
            <strong>Start adding picks</strong> when curator reviews open, clearly labelled as yours.
          </li>
        </ol>
        <p class="note">Curator reviews aren’t live yet. Applying puts you first in line and lets you help design them.</p>
        <p>
          <a class="btn btn-pop" href={SITE.curatorUrl} rel="noopener">
            Apply to be a curator
          </a>
        </p>
      </div>
    </Layout>
  );
}

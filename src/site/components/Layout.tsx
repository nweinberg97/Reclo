import { raw, type Child, type Html } from '#jsx/jsx-runtime';
import { SITE, absolute, href } from '../config.ts';
import { COPY } from '../copy.ts';
import { ASSET_VERSION } from '../assets.ts';

export interface Meta {
  /** Page title without the site name. Omit on the home page. */
  title?: string;
  description: string;
  /** Site-relative path of this page, e.g. "vancouver/restaurants/". */
  path: string;
  /** Site-relative path of the link-preview image. */
  ogImage: string;
  ogImageAlt: string;
  /** Accent colour for this page (city cover). */
  accent?: string;
  accentInk?: string;
  jsonLd?: object;
  noindex?: boolean;
}

/** Runs before first paint so a chosen theme never flashes. */
const THEME_BOOT = `(function(){try{var t=localStorage.getItem('reclo-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}})();`;

export function Layout(props: { meta: Meta; children?: Child; bodyClass?: string }): Html {
  const { meta } = props;
  const fullTitle = meta.title ? `${meta.title} · Reclo` : `Reclo: ${COPY.tagline}`;
  const style = meta.accent ? `--accent:${meta.accent};--accent-ink:${meta.accentInk ?? '#fff'}` : undefined;
  return (
    <>
      {raw('<!doctype html>')}
      <html lang="en" style={style}>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <title>{fullTitle}</title>
          <meta name="description" content={meta.description} />
          <link rel="canonical" href={absolute(meta.path)} />
          {meta.noindex ? <meta name="robots" content="noindex" /> : null}
          <meta name="color-scheme" content="light dark" />
          <meta name="theme-color" media="(prefers-color-scheme: light)" content={meta.accent ?? '#F6F7F3'} />
          <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#111A2C" />
          <meta property="og:site_name" content="Reclo" />
          <meta property="og:type" content="website" />
          <meta property="og:title" content={meta.title ?? `Reclo: ${COPY.tagline}`} />
          <meta property="og:description" content={meta.description} />
          <meta property="og:url" content={absolute(meta.path)} />
          <meta property="og:image" content={absolute(meta.ogImage)} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:alt" content={meta.ogImageAlt} />
          <meta name="twitter:card" content="summary_large_image" />
          <link rel="icon" href={href('favicon.svg')} type="image/svg+xml" />
          <link rel="apple-touch-icon" href={href('apple-touch-icon.png')} />
          <link rel="preload" href={href('fonts/inter-display-900.woff')} as="font" type="font/woff" crossorigin="" />
          <link rel="preload" href={href('fonts/inter-400.woff')} as="font" type="font/woff" crossorigin="" />
          <link rel="stylesheet" href={href(`assets/reclo.css?v=${ASSET_VERSION}`)} />
          <script>{raw(THEME_BOOT)}</script>
          <script src={href(`assets/reclo.js?v=${ASSET_VERSION}`)} defer=""></script>
          {meta.jsonLd ? (
            <script type="application/ld+json">{raw(JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c'))}</script>
          ) : null}
        </head>
        <body class={props.bodyClass}>
          <a class="skip" href="#main">
            Skip to content
          </a>
          <Header />
          <main id="main" tabindex="-1">
            {props.children}
          </main>
          <Footer />
          <SearchDialog />
          <div class="toast" role="status" aria-live="polite" data-toast=""></div>
        </body>
      </html>
    </>
  );
}

export function Wordmark(): Html {
  return raw(
    `<svg class="wordmark-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect x="4" y="3" width="22" height="26" rx="3" fill="currentColor"/><rect x="8" y="3" width="2" height="26" fill="var(--paper)" opacity=".5"/><path d="M19 3v11l3-2.2 3 2.2V3z" fill="var(--highlight)"/></svg>`,
  );
}

function Header(): Html {
  return (
    <header class="site-header">
      <a class="wordmark" href={href('')} aria-label="Reclo, home">
        <Wordmark />
        <span>reclo</span>
      </a>
      <div class="header-actions">
        <form class="header-search" action={href('search/')} method="get" role="search" data-search-open="">
          <label class="visually-hidden" for="header-q">
            {COPY.searchLabel}
          </label>
          <input id="header-q" name="q" type="search" placeholder="Search" autocomplete="off" />
          <button type="submit" class="icon-btn" aria-label="Search">
            {raw(SEARCH_ICON)}
          </button>
        </form>
        <a class="icon-btn saved-link" href={href('saved/')} aria-label="Saved places" data-saved-link="">
          {raw(HEART_SVG)}
          <span class="saved-count" data-saved-count="" hidden=""></span>
        </a>
        <button type="button" class="icon-btn theme-toggle" data-theme-toggle="" aria-label="Switch theme">
          {raw(THEME_ICON)}
        </button>
      </div>
    </header>
  );
}

function Footer(): Html {
  return (
    <footer class="site-footer">
      <p class="footer-promise">{COPY.footerPromise}</p>
      <nav aria-label="About Reclo">
        <ul>
          <li>
            <a href={href('how-reclo-ranks/')}>{COPY.howWeRank}</a>
          </li>
          <li>
            <a href={href('curators/')}>Become a curator</a>
          </li>
          <li>
            <a href={href('privacy/')}>{COPY.privacy}</a>
          </li>
          <li>
            <a href={SITE.feedbackUrl} rel="noopener">
              {COPY.tellUs}
            </a>
          </li>
        </ul>
      </nav>
      <p class="footer-small">
        Reclo is free and read-only. Content © Reclo, all rights reserved. Fonts: Inter and Lora (SIL Open Font License).
      </p>
    </footer>
  );
}

function SearchDialog(): Html {
  return (
    <dialog class="search-dialog" data-search-dialog="" aria-label="Search Reclo">
      <form class="search-dialog-form" method="dialog" role="search">
        <label class="visually-hidden" for="dialog-q">
          {COPY.searchLabel}
        </label>
        {raw(SEARCH_ICON)}
        <input
          id="dialog-q"
          type="search"
          placeholder={COPY.searchPlaceholder}
          autocomplete="off"
          spellcheck="false"
          role="combobox"
          aria-expanded="false"
          aria-controls="dialog-results"
          aria-autocomplete="list"
          data-search-input=""
        />
        <button type="button" class="icon-btn mic-btn" data-voice="" aria-label="Search by voice" hidden="">
          {raw(MIC_ICON)}
        </button>
        <button type="button" class="text-btn" data-search-close="">
          Close
        </button>
      </form>
      <div class="search-results" id="dialog-results" role="listbox" aria-label="Results" data-search-results=""></div>
      <p class="visually-hidden" aria-live="polite" data-search-status=""></p>
    </dialog>
  );
}

const HEART_SVG = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2.1 0 3.6 1.1 5 2.9 1.4-1.8 2.9-2.9 5-2.9 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
export const MIC_ICON = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

export const SEARCH_ICON = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m15.5 15.5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const THEME_ICON = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>`;

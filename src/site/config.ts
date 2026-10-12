/**
 * Site-wide settings. Override at build time with environment variables, e.g.
 *   RECLO_SITE_URL=https://reclo.example npm run build
 */
const siteUrl = (process.env.RECLO_SITE_URL ?? 'https://nweinberg97.github.io/Reclo').replace(/\/+$/, '');

export const SITE = {
  name: 'Reclo',
  /** Absolute origin + path where the site is served, without a trailing slash. */
  url: siteUrl,
  /** Path prefix for every link, with leading and trailing slash, e.g. "/reclo/". */
  base: `${new URL(siteUrl).pathname.replace(/\/+$/, '')}/`,
  /** Where "Tell us" goes. A simple public form; no account needed to read, a GitHub account to post. */
  feedbackUrl: process.env.RECLO_FEEDBACK_URL ?? 'https://github.com/nweinberg97/Reclo/issues/new',
  repoUrl: 'https://github.com/nweinberg97/Reclo',
  locale: 'en',
};

/** Root-relative link to a site path, e.g. href("vancouver/") → "/reclo/vancouver/". */
export function href(path = ''): string {
  return `${SITE.base}${path.replace(/^\/+/, '')}`;
}

/** Absolute URL for link previews and sharing. */
export function absolute(path = ''): string {
  return `${SITE.url}/${path.replace(/^\/+/, '')}`;
}

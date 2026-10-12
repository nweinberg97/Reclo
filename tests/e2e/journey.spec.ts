/**
 * The main journeys, end to end, on a phone and a desktop:
 *   land → pick a city → browse a list → open a pick → share
 *   search → result
 * Run after `npm run build` (the share images must exist).
 */
import { expect, test } from 'playwright/test';
import { SITE } from '../../src/site/config.ts';

test('land, open a city, browse a list, open a pick and share it', async ({ page, context, browserName }) => {
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The best of every city, with the receipts.');

  // One tap into a city from the shelf.
  await page.getByRole('link', { name: /^Vancouver:/ }).click();
  await expect(page).toHaveURL(/\/vancouver\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Vancouver' })).toBeVisible();

  // Open the full restaurants list from its tab.
  await page.getByRole('navigation', { name: 'Vancouver lists' }).getByRole('link', { name: /Restaurants & cafés/ }).click();
  await expect(page).toHaveURL(/\/vancouver\/restaurants\/$/);
  const rows = page.locator('.place-grid .place-card');
  await expect(rows).toHaveCount(25);
  await expect(rows.first()).toContainText(/Number #?1/);

  // Open the #1 pick: it must show why it's here and at least two receipts.
  const firstName = (await rows.first().locator('.place-card-name').innerText()).trim();
  await rows.first().getByRole('link').click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(firstName);
  await expect(page.getByRole('heading', { name: 'Why it’s here' })).toBeVisible();
  expect(await page.locator('.receipt').count()).toBeGreaterThanOrEqual(2);
  for (const link of await page.locator('.receipt-title').all()) {
    await expect(link).toHaveAttribute('href', /^https:\/\//);
  }

  // Link preview is designed and present.
  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(og).toMatch(/\/og\/vancouver\/restaurants\/.+\.png$/);
  const ogRes = await page.request.get(new URL(og!).pathname.replace(SITE.base, './'));
  expect(ogRes.status()).toBe(200);
  expect(ogRes.headers()['content-type']).toBe('image/png');

  // The story image exists and is a real image.
  const storyHref = await page.getByRole('link', { name: 'Share to your story' }).getAttribute('href');
  const story = await page.request.get(storyHref!);
  expect(story.status()).toBe(200);
  expect(story.headers()['content-type']).toBe('image/png');

  // Share: without the Web Share API, the link is copied and confirmed.
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }));
  await page.getByRole('button', { name: 'Share link' }).click();
  await expect(page.locator('[data-toast]')).toHaveText('Link copied');
});

test('search finds cities, places and accents, instantly', async ({ page }) => {
  await page.goto('./');
  await page.locator('#hero-q').click();
  const box = page.getByRole('combobox');
  await expect(box).toBeFocused();

  await box.fill('toro');
  await expect(page.getByRole('option').first()).toContainText('Toronto');

  // "cafe" matches "cafés", and results lead somewhere real.
  await box.fill('cafe vancouver');
  await expect(page.getByRole('option').first()).toBeVisible();

  await box.fill('kissa');
  await box.press('Enter');
  await expect(page).toHaveURL(/\/vancouver\/restaurants\/kissa-tanto\/$/);
});

test('a search with no results says what to try next', async ({ page }) => {
  await page.goto('./search/?q=zzqxv');
  await expect(page.locator('.search-empty')).toContainText('Nothing for “zzqxv” yet.');
});

test('unfinished lists and empty events are honest, not padded', async ({ page }) => {
  await page.goto('./paris/hotels/');
  await expect(page.getByRole('heading', { name: 'We’re still checking this list' })).toBeVisible();
  await expect(page.locator('.place-grid .place-card')).toHaveCount(0);

  await page.goto('./vancouver/events/');
  await expect(page.getByRole('heading', { name: /still blank|Nothing on the calendars/ })).toBeVisible();
});

test('every page has one h1, a canonical URL and no broken internal links on the main path', async ({ page }) => {
  for (const path of ['./', './toronto/', './toronto/things-to-do/', './how-reclo-ranks/', './privacy/']) {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https:\/\//);
  }
  await page.goto('./toronto/things-to-do/');
  const hrefs = await page.locator(`main a[href^="${SITE.base}"]`).evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href')!));
  for (const href of [...new Set(hrefs)].slice(0, 40)) {
    const res = await page.request.get(href);
    expect(res.status(), href).toBe(200);
  }
});

test('keyboard users can skip to content and see focus', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard journey');
  await page.goto('./vancouver/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  const outline = await page.getByRole('link', { name: 'Skip to content' }).evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');

  // Tabbing through the header search must not pop the search dialog open.
  await page.locator('#header-q').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-search-dialog]')).not.toHaveAttribute('open', '');
  // Typing in it does open instant search, with the typed letter kept.
  await page.locator('#header-q').focus();
  await page.keyboard.type('s');
  await expect(page.getByRole('combobox')).toHaveValue('s');
});

test('images have text alternatives and controls have names', async ({ page }) => {
  for (const path of ['./', './new-york/', './new-york/hotels/', './toronto/restaurants/alo/']) {
    await page.goto(path);
    const missingAlt = await page.locator('img:not([alt])').count();
    expect(missingAlt, `${path} images without alt`).toBe(0);
    const unnamed = await page.locator('button').evaluateAll((bs) => bs.filter((b) => !(b.getAttribute('aria-label') || b.textContent?.trim())).length);
    expect(unnamed, `${path} unnamed buttons`).toBe(0);
    const svgArt = await page.locator('.pic svg.art').evaluateAll((s) => s.every((el) => el.getAttribute('role') === 'img' && el.getAttribute('aria-label')));
    expect(svgArt).toBe(true);
  }
});

test('save places, then compare them side by side', async ({ page }) => {
  await page.goto('./new-york/restaurants/');
  const cards = page.locator('.place-grid .place-card');
  const names = [];
  for (const i of [0, 1]) {
    names.push((await cards.nth(i).locator('.place-card-name').innerText()).trim());
    await cards.nth(i).getByRole('button', { name: /^Save / }).click();
  }
  await expect(cards.nth(0).getByRole('button', { name: /^Save / })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-saved-count]')).toHaveText('2');

  await page.getByRole('link', { name: /Saved places/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Saved' })).toBeVisible();
  await expect(page.locator('.place-grid .place-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Compare' }).click();
  const table = page.getByRole('region', { name: 'Compare saved places' });
  for (const n of names) await expect(table).toContainText(n);
  await expect(table).toContainText('Why it’s here');

  // Saved survives a reload, and can be removed.
  await page.reload();
  await expect(page.locator('.place-grid .place-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Clear all' }).click();
  await expect(page.getByRole('heading', { name: 'Nothing saved yet' })).toBeVisible();
});

test('searching a kind of place shows every match as photo cards', async ({ page }) => {
  await page.goto('./search/?q=pizza');
  await expect(page.locator('[data-search-heading]')).toContainText('places for “pizza”');
  const n = await page.locator('.search-results-page .place-card').count();
  expect(n).toBeGreaterThanOrEqual(3);
  await page.goto('./search/?q=museum');
  expect(await page.locator('.search-results-page .place-card').count()).toBeGreaterThan(10);
});

test('rows have working arrow buttons', async ({ page, isMobile }) => {
  test.skip(isMobile, 'arrows are for pointer users; phones swipe');
  await page.goto('./');
  const rail = page.locator('.rail').filter({ hasText: 'Where to eat' });
  const next = rail.getByRole('button', { name: /^Next in/ });
  const prev = rail.getByRole('button', { name: /^Previous in/ });
  await expect(prev).toBeDisabled();
  await next.click();
  await expect(prev).toBeEnabled();
});

test('curators can find out how to apply', async ({ page }) => {
  await page.goto('./curators/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Put your name on it');
  await expect(page.getByRole('link', { name: 'Apply to be a curator' }).first()).toHaveAttribute('href', /^(https:|mailto:)/);
});

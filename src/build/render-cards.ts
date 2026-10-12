/** Renders card HTML to PNG with headless Chromium, a few pages at a time. */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';
import type { CardJob } from './cards.tsx';

export async function renderCards(jobs: CardJob[], dist: string, concurrency = 6): Promise<void> {
  const t0 = Date.now();
  const tmp = join(dist, '_cards');
  mkdirSync(tmp, { recursive: true });
  const browser = await chromium.launch();
  try {
    let next = 0;
    let done = 0;
    await Promise.all(
      Array.from({ length: concurrency }, async (_, worker) => {
        const ctx = await browser.newContext({ deviceScaleFactor: 1 });
        const page = await ctx.newPage();
        while (next < jobs.length) {
          const job = jobs[next++]!;
          const file = join(tmp, `w${worker}.html`);
          writeFileSync(file, job.html);
          await page.setViewportSize({ width: job.width, height: job.height });
          await page.goto(`file://${file}`, { waitUntil: 'load' });
          await page.evaluate(() => document.fonts.ready);
          const out = join(dist, job.out);
          mkdirSync(dirname(out), { recursive: true });
          await page.screenshot({ path: out, type: 'png', clip: { x: 0, y: 0, width: job.width, height: job.height } });
          done++;
        }
        await ctx.close();
      }),
    );
    console.log(`✓ ${done} share images in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } finally {
    await browser.close();
    rmSync(tmp, { recursive: true, force: true });
  }
}

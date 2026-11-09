import preact from '@preact/preset-vite';
import { checker, withBrowser, withServer } from './lib.mjs';

const c = checker();
await withServer(
  { root: 'e2e/harness', publicDir: '../../public', plugins: [preact()], server: { port: 5189 } },
  (url) =>
    withBrowser(async (browser) => {
      const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForSelector('.chart-host svg');

      c.ok(
        (await page.locator('.chart-host svg path[stroke]').count()) >= 3,
        'three series are drawn',
      );
      c.ok((await page.locator('.chart-legend li').count()) === 3, 'legend lists three names');
      c.ok(
        await page.evaluate(() => getComputedStyle(document.body).direction === 'rtl'),
        'page is RTL',
      );
      c.ok(
        (await page.locator('.chart-img').getAttribute('aria-label')) === 'שרון, נועם וקרן',
        'text alternative present',
      );

      const box = await page.locator('.chart-host svg').boundingBox();
      await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.5);
      await page.waitForSelector('g[aria-label="tip"]');
      const tip = await page.locator('g[aria-label="tip"]').first().textContent();
      c.ok(
        /(שרון|נועם|קרן)/.test(tip) && /\d{4}/.test(tip),
        `hover shows name and year (${JSON.stringify(tip)})`,
      );

      await page.setViewportSize({ width: 360, height: 700 });
      await page.waitForTimeout(300);
      const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      c.ok(w[0] <= w[1], `no horizontal overflow at 360px (${w[0]} <= ${w[1]})`);
      c.ok(errors.length === 0, `no console errors ${errors.join('; ')}`);
    }),
);
c.done();

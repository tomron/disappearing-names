import preact from '@preact/preset-vite';
import { checker, withBrowser, withServer } from './lib.mjs';

const c = checker();
await withServer({ plugins: [preact()], server: { port: 5192 } }, (url) =>
  withBrowser(async (browser) => {
    const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const names = (section) =>
      page.locator(`section[aria-labelledby="section-${section}"] .card-name`).allTextContents();

    await page.goto(`${url}/discover`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.card');
    for (const s of ['vanished', 'fell', 'surged']) {
      const n = (await names(s)).length;
      c.ok(n > 0 && n <= 12, `${s} section shows ${n} cards`);
    }
    c.ok(
      (await page.locator('.card svg.sparkline polyline').count()) > 10,
      'cards have sparklines',
    );
    const text = await page.locator('.card .card-text').first().textContent();
    c.ok(
      /שנות/.test(text) && /לא מפורסם|ירידה|פי/.test(text),
      `card text is plain language (${text})`,
    );

    // sector filter uses that sector's data
    const before = await names('vanished');
    await page.getByText('דרוזים', { exact: true }).click();
    await page.waitForTimeout(200);
    const druze = await names('vanished');
    c.ok(
      druze.length > 0 && JSON.stringify(druze) !== JSON.stringify(before),
      `Druze filter changes the cards (${druze.slice(0, 3).join(', ')})`,
    );

    // reshuffle changes the selection but stays within qualifying names
    await page.getByText('כל העשורים').click();
    await page.getByText('כלל האוכלוסייה', { exact: true }).click();
    await page.waitForTimeout(200);
    const first = await names('vanished');
    let changed = false;
    for (let i = 0; i < 5 && !changed; i++) {
      await page.getByRole('button', { name: /ערבבו מחדש/ }).click();
      changed = JSON.stringify(await names('vanished')) !== JSON.stringify(first);
    }
    c.ok(changed, 'reshuffle shows a different selection');

    // decade filter
    await page.getByText('שנות השבעים', { exact: true }).click();
    const decadeCards = await page
      .locator('section:not([aria-labelledby="section-surged"]) .card-text')
      .allTextContents();
    c.ok(
      decadeCards.length > 0 && decadeCards.every((t) => /שנות השבעים/.test(t)),
      'decade filter keeps only fallen names that peaked then',
    );

    // card opens the name in the explorer with the filters
    await page.getByText('מוסלמים', { exact: true }).click();
    await page.waitForTimeout(200);
    const link = page.locator('.card a').first();
    const name = await link.locator('.card-name').textContent();
    await link.click();
    await page.waitForSelector('.result .chart-host svg');
    const u = new URL(page.url());
    c.ok(
      u.pathname === '/' &&
        u.searchParams.get('name') === name &&
        u.searchParams.get('sector') === 'muslim',
      `card opens "${name}" in the explorer with the Muslim filter`,
    );
    c.ok((await page.textContent('#result-name')) === name, 'explorer shows the chosen name');

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`${url}/discover`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.card');
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    c.ok(w[0] <= w[1], `no horizontal overflow at 360px (${w[0]} <= ${w[1]})`);
    if (process.argv[2]) await page.screenshot({ path: process.argv[2] });
    c.ok(errors.length === 0, `no console errors ${errors.join('; ')}`);
  }),
);
c.done();

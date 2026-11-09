import preact from '@preact/preset-vite';
import { checker, withBrowser, withServer } from './lib.mjs';

const c = checker();
await withServer({ plugins: [preact()], server: { port: 5194 } }, (url) =>
  withBrowser(async (browser) => {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const q = (p) => new URL(page.url()).searchParams.get(p);
    const add = async (n) => {
      await page.fill('#name-search', n);
      await page.keyboard.press('Enter');
    };
    const rows = (i) => page.locator('.tables table').nth(i).locator('tbody th').allTextContents();

    await page.goto(`${url}/compare`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.tables table');
    c.ok(
      (await rows(0)).length > 0 && (await rows(1)).length > 0,
      'risers and fallers tables are filled',
    );

    for (const n of ['שרון', 'נועם', 'קרן']) await add(n);
    await page.waitForSelector('.chart-host svg');
    await page.waitForFunction(() => document.querySelectorAll('.chart-legend li').length === 3);
    c.ok(
      (await page.locator('.chart-host svg path[stroke]').count()) >= 3,
      'three names are drawn on one chart',
    );
    c.ok(q('names') === 'שרון,נועם,קרן', `URL carries the names (${q('names')})`);

    for (const n of ['דנה', 'מאיה']) await add(n);
    await add('אורי'); // sixth
    c.ok(
      (await page.textContent('[role=status]')).includes('עד 5 שמות'),
      'sixth name is refused with an explanation',
    );
    c.ok(q('names').split(',').length === 5, 'chart keeps five names');

    await page.getByRole('button', { name: 'הסרה: מאיה' }).click();
    await page.getByRole('button', { name: 'הסרה: דנה' }).click();

    // decade range narrows the tables and chart
    const before = (await rows(1)).length;
    await page.selectOption('select >> nth=0', '1970');
    await page.selectOption('select >> nth=1', '1985');
    await page.waitForTimeout(200);
    const fallers = await page
      .locator('.tables table')
      .nth(1)
      .locator('tbody tr')
      .evaluateAll((trs) => trs.map((tr) => Number(tr.children[1].textContent)));
    c.ok(
      fallers.length > 0 &&
        fallers.length <= before &&
        fallers.every((y) => y >= 1970 && y <= 1985),
      `range 1970-1985 keeps only peaks inside it (${fallers.length} of ${before})`,
    );
    const axisYears = await page
      .locator('.chart-host svg g[aria-label="x-axis tick label"] text')
      .allTextContents();
    c.ok(
      axisYears.length > 0 && axisYears.every((y) => +y >= 1970 && +y <= 1985),
      `chart x-axis is limited to the range (${axisYears.join(',')})`,
    );
    c.ok(q('from') === '1970' && q('to') === '1985', 'range is in the URL');

    // sorting
    await page
      .locator('.tables table')
      .nth(1)
      .getByRole('button', { name: /שנת שיא/ })
      .click();
    const sorted = await page
      .locator('.tables table')
      .nth(1)
      .locator('tbody tr')
      .evaluateAll((trs) => trs.map((tr) => Number(tr.children[1].textContent)));
    c.ok(
      sorted.every((y, i) => i === 0 || sorted[i - 1] >= y),
      'sorts by peak year, descending',
    );

    // row to chart
    const target = (await rows(1))[0];
    await page
      .locator('.tables table')
      .nth(1)
      .getByRole('button', { name: `הוספה: ${target}` })
      .click();
    await page.waitForTimeout(300);
    c.ok(q('names').includes(target), `table row "${target}" was added to the chart`);

    // restore in a fresh page
    const page2 = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    await page2.goto(page.url(), { waitUntil: 'networkidle' });
    await page2.waitForSelector('.chart-host svg');
    c.ok(
      (await page2.locator('.picked li').count()) === q('names').split(',').length,
      'shared link restores the names',
    );
    c.ok(
      (await page2.locator('select').nth(0).inputValue()) === '1970',
      'shared link restores the range',
    );
    await page2.close();

    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(300);
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    c.ok(w[0] <= w[1], `no horizontal page overflow at 360px (${w[0]} <= ${w[1]})`);
    if (process.argv[2]) await page.screenshot({ path: process.argv[2], fullPage: true });
    c.ok(errors.length === 0, `no console errors ${errors.join('; ')}`);
  }),
);
c.done();

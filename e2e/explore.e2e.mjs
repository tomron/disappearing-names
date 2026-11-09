import preact from '@preact/preset-vite';
import { checker, withBrowser, withServer } from './lib.mjs';

const c = checker();
await withServer({ plugins: [preact()], server: { port: 5190 } }, (url) =>
  withBrowser(async (browser) => {
    const index = await (await fetch(`${url}/data/index.json`)).json();
    const totalOnly = index.find((r) => r[2] === 0)[0];

    const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const q = (p) => new URL(page.url()).searchParams.get(p);

    await page.goto(url, { waitUntil: 'networkidle' });
    c.ok(
      (await page.locator('.note').first().textContent()).includes('הפתיעו אותי'),
      'intro is shown before any search',
    );

    // 4.1 search with suggestions, selecting with the keyboard
    await page.fill('#name-search', 'שרו');
    await page.waitForSelector('[role=option]');
    const options = await page.locator('[role=option] span').allTextContents();
    c.ok(options.includes('שרון'), `suggestions include שרון (${options.join(', ')})`);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.result .chart-host svg');
    c.ok(q('name') === 'שרון', 'URL carries the selected name');
    c.ok((await page.textContent('#result-name')) === 'שרון', 'result heading shows the name');

    // 4.2 chart + 4.4 summary
    c.ok((await page.locator('.chart-host svg path[stroke]').count()) >= 1, 'chart line is drawn');
    c.ok(
      (await page.locator('.chart-img').getAttribute('aria-label')).includes('השיא היה ב-1974'),
      'text alternative states the peak',
    );
    c.ok((await page.textContent('.summary')).includes('ירידה של'), 'summary describes the fall');
    c.ok(
      (await page.locator('.chart-host svg g[aria-label="rule"][stroke-dasharray]').count()) >= 1,
      'peak year is highlighted',
    );
    const box = await page.locator('.chart-host svg').boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.waitForSelector('g[aria-label="tip"]');
    c.ok(
      /שרון/.test(await page.locator('g[aria-label="tip"]').first().textContent()),
      'hover tooltip shows the name',
    );

    // share mode + 4.3 filters
    await page.getByText('שיעור מכלל הלידות').click();
    c.ok(q('mode') === 'share', 'share mode is in the URL');
    c.ok(
      (await page.textContent('.axis-title')).includes('אחוז'),
      'axis title switches to percent',
    );
    await page.getByText('יהודים', { exact: true }).click();
    c.ok(q('sector') === 'jewish', 'sector filter is in the URL');
    c.ok((await page.textContent('.summary')).includes('יהודים'), 'summary reflects the sector');
    await page.getByText('מספר לידות', { exact: true }).click();
    await page.getByText('הצג כל אוכלוסייה בנפרד').click();
    await page.waitForTimeout(400);
    const legend = await page.locator('.chart-legend li').allTextContents();
    c.ok(
      legend.length >= 2 && legend.includes('יהודים'),
      `split draws one line per sector (${legend.join(', ')})`,
    );

    // not found + total-only
    await page.fill('#name-search', 'זזזזזז');
    await page.keyboard.press('Enter');
    c.ok(
      (await page.textContent('[role=status]')).includes('לא מצאנו'),
      'unknown name shows a not-found message mentioning the threshold',
    );
    await page.fill('#name-search', totalOnly);
    await page.keyboard.press('Enter');
    await page.waitForSelector('text=אין עבורו גרף');
    c.ok(true, `total-only name "${totalOnly}" explains it has no chart`);

    // 4.5 surprise respects filters
    await page.goto(`${url}/?sector=muslim&sex=M`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /הפתיעו אותי/ }).click();
    await page.waitForSelector('.pick');
    const pick = await page.textContent('.pick');
    c.ok(
      pick.includes('מוסלמים') && (pick.includes('ירידה') || pick.includes('עלה')),
      `surprise states direction and sector (${pick.trim()})`,
    );
    c.ok(
      q('sector') === 'muslim' && q('sex') === 'M' && !!q('name'),
      'surprise keeps filters and sets the name in the URL',
    );
    await page.waitForSelector('.result .chart-host svg');

    // 4.6 shared URL restores the view in a fresh page
    const shared = `${url}/?name=${encodeURIComponent('קרן')}&sector=jewish&sex=F&mode=share&split=1`;
    const page2 = await browser.newPage({ viewport: { width: 1000, height: 900 } });
    await page2.goto(shared, { waitUntil: 'networkidle' });
    await page2.waitForSelector('.result .chart-host svg');
    c.ok((await page2.textContent('#result-name')) === 'קרן', 'shared link opens on the name');
    c.ok(
      await page2
        .locator('input[name=mode][checked], input[name=mode]:checked')
        .first()
        .evaluate((el) => el.nextElementSibling.textContent.includes('שיעור')),
      'share mode restored',
    );
    c.ok(
      await page2.locator('input[name=sex]:checked').evaluate((el) => el.value === 'F'),
      'sex filter restored',
    );
    c.ok(await page2.locator('input[type=checkbox]').isChecked(), 'split mode restored');
    await page2.close();

    // phone width
    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(300);
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    c.ok(w[0] <= w[1], `no horizontal overflow at 360px (${w[0]} <= ${w[1]})`);
    if (process.argv[2]) await page.screenshot({ path: process.argv[2], fullPage: true });
    c.ok(errors.length === 0, `no console errors ${errors.join('; ')}`);
  }),
);
c.done();

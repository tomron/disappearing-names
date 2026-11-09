// Runs against a deployed site: node e2e/live.e2e.mjs https://<host>/<base>/
import { devices } from 'playwright-core';
import { checker, withBrowser } from './lib.mjs';

const site = (process.argv[2] ?? '').replace(/\/?$/, '/');
if (!/^https?:\/\//.test(site)) {
  console.error('Usage: node e2e/live.e2e.mjs https://<host>/<base>/');
  process.exit(2);
}
const c = checker();
const at = (path = '') => new URL(path, site).href;
const enc = encodeURIComponent;

await withBrowser(async (browser) => {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'he-IL' });
  const page = await ctx.newPage();
  const errors = [];
  const failed = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    // A deep link's own document is served by GitHub Pages as 404.html with status 404; ignore that one line.
    if (m.type() === 'error' && !/status of 404/.test(m.text())) errors.push(m.text());
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && r.request().resourceType() !== 'document')
      failed.push(`${r.status()} ${r.url()}`);
  });

  // Transferred bytes for the first load (compressed, as the network saw it)
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  const sizes = new Map();
  cdp.on('Network.responseReceived', (e) => sizes.set(e.requestId, e.response.url));
  const bytes = {};
  cdp.on('Network.loadingFinished', (e) => {
    const url = sizes.get(e.requestId);
    if (url) bytes[url] = e.encodedDataLength;
  });

  await page.goto(at(), { waitUntil: 'networkidle' });
  await page.waitForSelector('.explore');
  const first = Object.entries(bytes);
  const total = first.reduce((a, [, n]) => a + n, 0);
  console.log(`first load: ${first.length} requests, ${(total / 1024).toFixed(0)} KB transferred`);
  for (const [u, n] of first)
    console.log(`   ${(n / 1024).toFixed(1).padStart(7)} KB  ${u.replace(site, '/')}`);
  c.ok(
    await page.evaluate(
      () => document.documentElement.dir === 'rtl' && document.documentElement.lang === 'he',
    ),
    'page is Hebrew and RTL',
  );
  c.ok(
    (await page.locator('footer').innerText()).includes('הלשכה המרכזית לסטטיסטיקה'),
    'CBS credit is in the footer',
  );
  c.ok((await page.locator('footer a').count()) >= 2, 'footer links to the CBS file and license');
  c.ok(
    first.every(([u]) => !/series\//.test(u)),
    'no per-name series are loaded on first paint',
  );
  c.ok(total < 400 * 1024, `first load under 400 KB (${(total / 1024).toFixed(0)} KB)`);

  // search
  await page.fill('#name-search', 'שרו');
  await page.waitForSelector('[role=option]');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.result .chart-host svg');
  c.ok(
    (await page.textContent('#result-name')) === 'שרון' &&
      (await page.textContent('.summary')).includes('השיא היה ב-1974'),
    'search opens שרון with its 1974 peak',
  );
  c.ok(
    new URL(page.url()).pathname.startsWith(new URL(site).pathname),
    'URL stays under the base path',
  );

  // surprise
  await page.getByRole('button', { name: /הפתיעו אותי/ }).click();
  await page.waitForSelector('.pick');
  await page.waitForSelector('.result .chart-host svg');
  c.ok(
    /ירידה|עלה/.test(await page.textContent('.pick')),
    `surprise picks a big mover (${(await page.textContent('.pick')).trim()})`,
  );

  // feed, then a card into the explorer
  await page.getByRole('link', { name: 'גלו שמות' }).click();
  await page.waitForSelector('.card');
  c.ok((await page.locator('.card').count()) >= 12, 'feed shows cards');
  const cardName = await page.locator('.card .card-name').first().textContent();
  await page.locator('.card a').first().click();
  await page.waitForSelector('.result .chart-host svg');
  c.ok(
    (await page.textContent('#result-name')) === cardName,
    `card opens "${cardName}" in the explorer`,
  );

  // compare
  await page.getByRole('link', { name: 'השוואה' }).click();
  for (const n of ['שרון', 'נועם', 'קרן']) {
    await page.fill('#name-search', n);
    await page.keyboard.press('Enter');
  }
  await page.waitForFunction(() => document.querySelectorAll('.chart-legend li').length === 3);
  c.ok(true, 'compare draws three names');
  c.ok(
    (await page.locator('.tables table tbody tr').count()) > 10,
    'risers and fallers tables are filled',
  );

  // mobile layout
  for (const path of ['', 'discover', 'compare']) {
    await page.goto(at(path), { waitUntil: 'networkidle' });
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    c.ok(w[0] <= w[1], `phone (${w[1]}px): no horizontal overflow on /${path} (${w[0]})`);
  }

  // deep link + refresh served through the GitHub Pages 404 fallback
  await page.goto(at(`compare?names=${enc('שרון,נועם')}&sector=jewish`), {
    waitUntil: 'networkidle',
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelectorAll('.chart-legend li').length === 2);
  c.ok(true, 'deep link with state works after a refresh');

  // embed inside a real iframe
  const desktop = await browser.newPage({ viewport: { width: 700, height: 700 } });
  await desktop.setContent(
    `<body style="margin:0"><iframe src="${at(`?embed=1&view=explore&name=${enc('קרן')}`)}" title="שמות שנעלמים" width="100%" height="520" style="border:0"></iframe></body>`,
  );
  const frame = await (await desktop.waitForSelector('iframe')).contentFrame();
  await frame.waitForSelector('.result .chart-host svg');
  c.ok(
    (await frame.locator('.site-header, nav').count()) === 0 &&
      (await frame.locator('.embed-footer').count()) === 1,
    'embed hides the chrome and keeps the attribution',
  );
  c.ok((await frame.textContent('#result-name')) === 'קרן', 'embed shows the requested name');

  c.ok(failed.length === 0, `no failed asset or data requests ${failed.slice(0, 3).join('; ')}`);
  c.ok(errors.length === 0, `no console errors ${errors.slice(0, 3).join('; ')}`);
});
c.done();

import preact from '@preact/preset-vite';
import { checker, withBrowser, withServer } from './lib.mjs';

const c = checker();
await withServer({ plugins: [preact()], server: { port: 5196 } }, (url) =>
  withBrowser(async (browser) => {
    const page = await browser.newPage({ viewport: { width: 700, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    // The snippet documented in README.md, with the site address filled in.
    const snippet = (src, h = 520) =>
      `<iframe src="${src}" title="שמות שנעלמים" width="100%" height="${h}" style="border:0" loading="lazy"></iframe>`;
    const host = (src) => `<body style="margin:0">${snippet(src)}</body>`;
    const frameOf = async (src) => {
      await page.setContent(host(src));
      const handle = await page.waitForSelector('iframe');
      const frame = await handle.contentFrame();
      await frame.waitForLoadState('networkidle');
      return frame;
    };

    // Explorer embedded for one name
    let frame = await frameOf(`${url}/?embed=1&view=explore&name=${encodeURIComponent('שרון')}`);
    await frame.waitForSelector('.result .chart-host svg');
    c.ok(
      (await frame.locator('.site-header, nav, .site-footer').count()) === 0,
      'no site header, navigation or full footer',
    );
    c.ok(
      (await frame.locator('.embed-footer').textContent()).includes('הלמ"ס'),
      'compact CBS attribution stays',
    );
    c.ok((await frame.textContent('#result-name')) === 'שרון', 'shows the requested name');
    c.ok(
      (await frame.locator('h2').count()) === 1 &&
        (await frame.locator('.compare, .discover').count()) === 0,
      'only the requested view is shown',
    );

    // Interaction inside the frame keeps the embed parameters
    await frame.fill('#name-search', 'קרן');
    await page.keyboard.press('Enter');
    await frame.waitForFunction(
      () => document.querySelector('#result-name')?.textContent === 'קרן',
    );
    const u = new URL(frame.url());
    c.ok(
      u.searchParams.get('embed') === '1' &&
        u.searchParams.get('view') === 'explore' &&
        u.searchParams.get('name') === 'קרן',
      `URL keeps embed, view and name (${u.search})`,
    );

    // Phone-sized frame
    await page.setViewportSize({ width: 360, height: 700 });
    await page.waitForTimeout(300);
    const overflow = await frame.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    c.ok(
      overflow[0] <= overflow[1],
      `no horizontal overflow in a 360px frame (${overflow[0]} <= ${overflow[1]})`,
    );
    c.ok(
      (await frame.locator('.chart-host svg').boundingBox()).width <= 360,
      'chart fits the frame',
    );

    // Other views embed too
    frame = await frameOf(`${url}/?embed=1&view=compare&names=${encodeURIComponent('שרון,נועם')}`);
    await frame.waitForSelector('.chart-legend li');
    c.ok(
      (await frame.locator('.chart-legend li').count()) === 2,
      'embedded comparison shows both names',
    );
    frame = await frameOf(`${url}/?embed=1&view=discover`);
    await frame.waitForSelector('.card');
    c.ok((await frame.locator('.site-header').count()) === 0, 'embedded feed has no site header');

    // Link to the full site drops the embed parameters
    const href = await frame.locator('.embed-footer a').getAttribute('href');
    c.ok(
      !href.includes('embed') && !href.includes('view='),
      `full-site link has no embed parameters (${href})`,
    );
    c.ok(errors.length === 0, `no console errors ${errors.join('; ')}`);
  }),
);
c.done();

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { build } from 'vite';
import { checker, withBrowser } from './lib.mjs';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};
const c = checker();

if (!existsSync('public/data/meta.json')) throw new Error('Run `npm run build:data` first.');

/** Serves `dir` under `prefix` the way GitHub Pages does: unknown paths get 404.html with status 404. */
function pagesServer(dir, prefix, port) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (!path.startsWith(prefix)) {
      res.writeHead(404).end('not found');
      return;
    }
    let file = join(dir, normalize(path.slice(prefix.length)));
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (existsSync(file)) {
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      createReadStream(file).pipe(res);
    } else {
      res.writeHead(404, { 'content-type': MIME['.html'] });
      createReadStream(join(dir, '404.html')).pipe(res);
    }
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

async function check(label, base, outDir, port, browser) {
  process.env.BASE_PATH = base;
  await build({ logLevel: 'silent', build: { outDir, emptyOutDir: true } });
  const server = await pagesServer(outDir, base, port);
  const origin = `http://localhost:${port}`;
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
    const bad = [];
    const outside = [];
    const errors = [];
    page.on('response', (r) => {
      const u = new URL(r.url());
      if (u.origin !== origin) return;
      if (!u.pathname.startsWith(base)) outside.push(u.pathname);
      // the only allowed non-200 is a deep link's own document (GitHub Pages serves 404.html for it)
      else if (r.status() !== 200 && r.request().resourceType() !== 'document')
        bad.push(`${r.status()} ${u.pathname}`);
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on(
      'console',
      (m) => m.type() === 'error' && !/status of 404/.test(m.text()) && errors.push(m.text()),
    );

    const name = encodeURIComponent('שרון');
    const pages = [
      ['root', base, '.explore'],
      ['deep link: discover', `${base}discover`, '.card'],
      [
        'deep link: compare with state',
        `${base}compare?names=${encodeURIComponent('שרון,נועם')}`,
        '.chart-legend li',
      ],
      ['deep link: explore with a name', `${base}?name=${name}`, '.result .chart-host svg'],
    ];
    for (const [what, path, ready] of pages) {
      await page.goto(origin + path, { waitUntil: 'networkidle' });
      await page.waitForSelector(ready, { timeout: 8000 });
      c.ok(true, `${label}: ${what} renders`);
    }
    // refresh on a deep link
    await page.goto(origin + `${base}discover`, { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.card');
    c.ok(true, `${label}: refreshing a deep link works`);

    // in-app navigation keeps the base path
    await page.click('nav a:has-text("השוואה")');
    c.ok(
      new URL(page.url()).pathname === `${base}compare`,
      `${label}: client navigation keeps the base (${new URL(page.url()).pathname})`,
    );
    await page.getByRole('link', { name: 'חיפוש שם' }).click();
    await page.fill('#name-search', 'קרן');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.result .chart-host svg');
    c.ok(new URL(page.url()).pathname === base, `${label}: search keeps the base path`);

    c.ok(
      bad.length === 0,
      `${label}: every asset and data file returns 200 ${bad.slice(0, 3).join('; ')}`,
    );
    c.ok(
      outside.length === 0,
      `${label}: no request escapes the base path ${outside.slice(0, 3).join('; ')}`,
    );
    c.ok(errors.length === 0, `${label}: no console errors ${errors.join('; ')}`);
    await page.close();
  } finally {
    server.close();
  }
}

await withBrowser(async (browser) => {
  await check(
    'subpath /disappearing-names/',
    '/disappearing-names/',
    'dist-smoke-sub',
    5201,
    browser,
  );
  await check('domain root /', '/', 'dist-smoke-root', 5202, browser);
});
delete process.env.BASE_PATH;
c.done();

import { readFileSync } from 'node:fs';
import preact from '@preact/preset-vite';
import { checker, withBrowser, withServer } from './lib.mjs';

const axeSource = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const c = checker();

const name = encodeURIComponent('שרון');
const VIEWS = [
  ['explore with a chart', `/?name=${name}`, '.result .chart-host svg'],
  ['explore, empty', '/', '.explore'],
  ['discover', '/discover', '.card'],
  ['compare', `/compare?names=${encodeURIComponent('שרון,נועם')}`, '.chart-legend li'],
];

await withServer({ plugins: [preact()], server: { port: 5197 } }, (url) =>
  withBrowser(async (browser) => {
    for (const scheme of ['light', 'dark']) {
      const ctx = await browser.newContext({
        colorScheme: scheme,
        viewport: { width: 900, height: 900 },
      });
      const page = await ctx.newPage();
      for (const [label, path, ready] of VIEWS) {
        await page.goto(url + path, { waitUntil: 'networkidle' });
        await page.waitForSelector(ready);
        await page.waitForTimeout(300);
        await page.evaluate(axeSource);
        const { violations } = await page.evaluate(() =>
          axe.run(document, {
            runOnly: {
              type: 'tag',
              values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
            },
          }),
        );
        for (const v of violations) {
          console.log(`  [${scheme}] ${label}: ${v.id} (${v.impact}) ${v.help}`);
          for (const n of v.nodes.slice(0, 3))
            console.log(
              `      ${n.target.join(' ')}  ${(n.failureSummary || '').split('\n')[1] ?? ''}`,
            );
        }
        c.ok(violations.length === 0, `axe: ${scheme} / ${label}`);
      }
      await ctx.close();
    }

    // Keyboard operation: tab through the explorer and use it without a mouse
    const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
    await page.goto(url + '/', { waitUntil: 'networkidle' });
    await page.waitForSelector('#name-search');
    await page.keyboard.press('Tab'); // skip link
    c.ok(
      await page.evaluate(() => document.activeElement?.className === 'skip'),
      'first Tab stops on the skip link',
    );
    await page.focus('#name-search');
    await page.keyboard.type('קר');
    await page.waitForSelector('[role=option]');
    await page.keyboard.press('ArrowDown');
    c.ok(
      await page.evaluate(
        () => document.activeElement?.getAttribute('aria-activedescendant') === 'suggestion-0',
      ),
      'arrow keys move through suggestions',
    );
    await page.keyboard.press('Enter');
    await page.waitForSelector('.result .chart-host svg');
    // chips are radio inputs, so arrow keys change them
    await page.focus('input[name=sector]:checked');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(200);
    c.ok(
      new URL(page.url()).searchParams.has('sector'),
      'sector filter can be changed with the keyboard',
    );
    c.ok(
      (await page.locator('.chart-img').getAttribute('role')) === 'img' &&
        !!(await page.locator('.chart-img').getAttribute('aria-label')),
      'chart has a text alternative',
    );
  }),
);
c.done();

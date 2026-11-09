import { createServer } from 'vite';
import { chromium } from 'playwright-core';

// Uses the Chrome already installed on the machine; set CHROME_PATH for another location.
export const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export async function withBrowser(fn) {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}

export async function withServer(config, fn) {
  const server = await createServer({ configFile: false, logLevel: 'error', ...config });
  await server.listen();
  try {
    return await fn(`http://localhost:${server.config.server.port}`);
  } finally {
    await server.close();
  }
}

export function checker() {
  let failed = 0;
  return {
    ok(cond, msg) {
      console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
      if (!cond) failed++;
    },
    done() {
      if (failed) {
        console.error(`${failed} check(s) failed`);
        process.exit(1);
      }
    },
  };
}

import { copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vitest/config';
import preact from '@preact/preset-vite';

// GitHub Pages serves 404.html for unknown paths; a copy of index.html lets deep links
// such as /discover?sector=druze load the app and be routed client-side.
function spaFallback(): Plugin {
  let outDir = 'dist';
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    configResolved: (c) => void (outDir = c.build.outDir),
    closeBundle: () => copyFileSync(join(outDir, 'index.html'), join(outDir, '404.html')),
  };
}

// BASE_PATH lets the same build serve at a domain root or under a subpath.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [preact(), spaFallback()],
  // Some tests parse the real 8 MB CBS workbook; allow for slower CI runners.
  test: { testTimeout: 30_000 },
});

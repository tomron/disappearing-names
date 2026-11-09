import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { metricsConfig } from './config';
import { buildData } from './lib/emit';

const RAW_DIR = 'data/raw';
const files = readdirSync(RAW_DIR).filter((f) => f.endsWith('.xlsx'));
if (files.length !== 1) {
  console.error(
    `Expected exactly one .xlsx in ${RAW_DIR}, found ${files.length}. See ${RAW_DIR}/README.md.`,
  );
  process.exit(1);
}

const result = await buildData({
  input: join(RAW_DIR, files[0]),
  outDir: 'public/data',
  config: metricsConfig,
});
console.log(
  `Built data from CBS ${result.meta.release}: ${result.meta.firstYear}-${result.meta.lastYear}, ` +
    `${result.index.length} names (${result.names} with series) in ${result.shards} shards`,
);

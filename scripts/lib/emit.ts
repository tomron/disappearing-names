import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import type { MetricsConfig } from '../config';
import { aggregate, SLICE_KEYS, SUPPRESSED_ESTIMATE, type SliceKey } from './aggregate';
import { sliceMetrics, sparkline, type Metrics } from './metrics';
import { shardOf } from '../../src/data/shard';
import { parseCbsWorkbook } from './parse-cbs';

export interface BuildOptions {
  input: string;
  outDir: string;
  config: MetricsConfig;
  now?: Date;
}

/** `11_25_391t1.xlsx` is table 1 of CBS release 391/2025. */
export function releaseId(file: string): string {
  const m = /^(\d+)_(\d{2})_(\d+)t\d+/.exec(basename(file));
  return m ? `${m[3]}/20${m[2]}` : basename(file);
}

export { shardOf };

const round = (x: number, digits = 6) => Number(x.toFixed(digits));

function moverRow(m: Metrics, spark: number[]) {
  return {
    name: m.name,
    peakYear: m.peakYear,
    peakCount: Math.round(m.peakCount),
    baselineShare: round(m.baselineShare),
    recentShare: round(m.recentShare),
    change: round(m.change, 4),
    vanished: m.vanished,
    spark,
  };
}

export interface CbsSource {
  release: string;
  title: string;
  file: string;
  /** Date the file was downloaded from CBS (YYYY-MM-DD); the CBS license asks for it in the credit. */
  retrieved: string;
  url: string;
  licenseUrl: string;
}

const SOURCE_FIELDS: (keyof CbsSource)[] = [
  'release',
  'title',
  'file',
  'retrieved',
  'url',
  'licenseUrl',
];

/** Reads `source.json` next to the raw file: the facts the CBS license requires in the credit. */
export function readSource(input: string): CbsSource {
  const path = join(dirname(input), 'source.json');
  if (!existsSync(path)) {
    throw new Error(
      `${path} is missing. It records the CBS release, file name, retrieval date and links (see data/raw/README.md).`,
    );
  }
  const source = JSON.parse(readFileSync(path, 'utf8')) as Partial<CbsSource>;
  for (const field of SOURCE_FIELDS) {
    if (typeof source[field] !== 'string' || !source[field])
      throw new Error(`${path}: "${field}" is missing`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source.retrieved!))
    throw new Error(`${path}: "retrieved" must be YYYY-MM-DD`);
  if (source.file !== basename(input))
    throw new Error(`${path}: "file" (${source.file}) does not match ${basename(input)}`);
  return source as CbsSource;
}

export async function buildData({ input, outDir, config, now = new Date() }: BuildOptions) {
  const cbs = readSource(input);
  const wb = await parseCbsWorkbook(input);
  const agg = aggregate(wb);
  const allNames = agg.slices.get('all/all')!.names;

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(join(outDir, 'series'), { recursive: true });
  const write = (file: string, data: unknown) =>
    writeFileSync(join(outDir, file), JSON.stringify(data));

  // movers.json and the set of names that have a chart-worthy series
  const movers: Record<string, { risers: unknown[]; fallers: unknown[] }> = {};
  const withSeries = new Set<string>();
  for (const key of SLICE_KEYS) {
    const slice = agg.slices.get(key)!;
    const metrics = [...sliceMetrics(slice, agg.years, config).values()];
    const top = (tag: 'riser' | 'faller', order: (m: Metrics) => number) =>
      metrics
        .filter((m) => m.tag === tag)
        .sort((a, b) => order(b) - order(a))
        .slice(0, config.moversPerSlice)
        .map((m) => moverRow(m, sparkline(slice.names.get(m.name)!, slice.births)));
    movers[key] = {
      risers: top('riser', (m) => m.change),
      fallers: top('faller', (m) => -m.change),
    };
    for (const s of slice.names.values()) {
      if (s.n.some((n) => n > 0)) withSeries.add(s.name);
    }
  }

  // series shards: per name, only the slices where it exists
  const shards = new Map<string, Record<string, unknown>>();
  for (const name of withSeries) {
    const slices: Record<string, { n: number[]; s: number[] }> = {};
    let total = 0;
    let residualSum = 0;
    for (const key of SLICE_KEYS) {
      const s = agg.slices.get(key)!.names.get(name);
      if (!s) continue;
      slices[key] = { n: s.n, s: s.s };
      if (key === 'all/all') {
        total = s.total;
        residualSum = s.residual;
      }
    }
    const id = shardOf(name);
    if (!shards.has(id)) shards.set(id, {});
    shards.get(id)![name] = { total, residual: residualSum, slices };
  }
  for (const [id, data] of shards) write(`series/${id}.json`, data);

  // index.json: [name, total, hasSeries]
  const index = [...allNames.values()]
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'he'))
    .map((s) => [s.name, s.total, withSeries.has(s.name) ? 1 : 0]);
  write('index.json', index);
  write('movers.json', movers);

  const births: Record<string, number[]> = {};
  for (const key of SLICE_KEYS) births[key] = agg.slices.get(key)!.births.map((b) => round(b, 1));
  const meta = {
    release: cbs.release,
    cbs,
    source: 'הלשכה המרכזית לסטטיסטיקה (הלמ"ס)',
    firstYear: agg.years[0],
    lastYear: agg.years[agg.years.length - 1],
    builtAt: now.toISOString(),
    sectors: ['jewish', 'muslim', 'christian', 'druze'],
    sexes: ['F', 'M'],
    slices: SLICE_KEYS as SliceKey[],
    suppressedMax: 4,
    publishedMin: 5,
    denominator: `published counts plus ${SUPPRESSED_ESTIMATE} per suppressed cell, per year, sector and sex`,
    config,
    births,
  };
  write('meta.json', meta);
  return { meta, index, shards: shards.size, names: withSeries.size };
}

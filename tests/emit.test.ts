import { copyFileSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { metricsConfig } from '../scripts/config';
import { SLICE_KEYS } from '../scripts/lib/aggregate';
import { buildData, readSource, releaseId, shardOf } from '../scripts/lib/emit';

const out = mkdtempSync(join(tmpdir(), 'names-data-'));
const readJson = (f: string) => JSON.parse(readFileSync(join(out, f), 'utf8'));
let built: Awaited<ReturnType<typeof buildData>>;

beforeAll(async () => {
  built = await buildData({
    input: 'data/raw/11_25_391t1.xlsx',
    outDir: out,
    config: metricsConfig,
    now: new Date('2026-01-01T00:00:00Z'),
  });
}, 60_000);

describe('releaseId', () => {
  it('derives the CBS release from the file name', () => {
    expect(releaseId('data/raw/11_25_391t1.xlsx')).toBe('391/2025');
    expect(releaseId('something.xlsx')).toBe('something.xlsx');
  });
});

describe('emitted data', () => {
  it('meta.json carries provenance', () => {
    const meta = readJson('meta.json');
    expect(meta).toMatchObject({
      release: '391/2025',
      firstYear: 1949,
      lastYear: 2024,
      builtAt: '2026-01-01T00:00:00.000Z',
      suppressedMax: 4,
      publishedMin: 5,
    });
    expect(meta.cbs).toMatchObject({
      release: '391/2025',
      file: '11_25_391t1.xlsx',
      retrieved: '2026-11-09',
    });
    expect(meta.cbs.url).toMatch(/^https:\/\/www\.cbs\.gov\.il\/.*11_25_391t1\.xlsx$/);
    expect(meta.cbs.licenseUrl).toMatch(/^https:\/\/www\.cbs\.gov\.il\//);
    expect(meta.denominator).toMatch(/suppressed/);
    expect(meta.config).toEqual(metricsConfig);
    expect(meta.slices).toEqual(SLICE_KEYS);
    for (const k of SLICE_KEYS) expect(meta.births[k]).toHaveLength(76);
  });

  it('index.json lists names by popularity with a series flag', () => {
    const index: [string, number, 0 | 1][] = readJson('index.json');
    expect(index.length).toBe(built.index.length);
    const totals = index.map((r) => r[1]);
    expect(totals).toEqual([...totals].sort((a, b) => b - a));
    expect(index.some((r) => r[2] === 0)).toBe(true); // total-only names stay searchable
    expect(index.some((r) => r[2] === 1)).toBe(true);
  });

  it('each name with a series lives in the shard for its first character', () => {
    const index: [string, number, 0 | 1][] = readJson('index.json');
    const [name] = index.find((r) => r[0] === 'שרון' && r[2] === 1)!;
    const shard = readJson(`series/${shardOf(name)}.json`);
    const entry = shard[name];
    expect(entry.slices['all/all'].n).toHaveLength(76);
    expect(entry.slices['all/all'].s).toHaveLength(76);
    expect(Object.keys(shard).every((n) => shardOf(n) === shardOf(name))).toBe(true);
  });

  it('movers.json has risers and fallers for every slice', () => {
    const movers = readJson('movers.json');
    for (const k of SLICE_KEYS) {
      expect(movers[k].risers.length).toBeLessThanOrEqual(metricsConfig.moversPerSlice);
      for (const r of movers[k].fallers) expect(r.change).toBeLessThanOrEqual(-0.8);
      for (const r of [...movers[k].risers, ...movers[k].fallers]) {
        expect(r.spark).toHaveLength(19); // 76 years in 4-year bins
        expect(Math.max(...r.spark)).toBe(100);
      }
      for (const r of movers[k].risers) expect(r.change).toBeGreaterThan(0);
    }
    expect(movers['all/all'].fallers.length).toBeGreaterThan(0);
  });

  it('the initial load (index + meta) is small and independent of the series shards', () => {
    const size = (f: string) => readFileSync(join(out, f)).length;
    const initial = size('index.json') + size('meta.json');
    const shards = readdirSync(join(out, 'series')).reduce((a, f) => a + size(`series/${f}`), 0);
    expect(initial).toBeLessThan(600_000); // raw bytes; about 95 KB gzipped
    expect(shards).toBeGreaterThan(initial);
  });
});

describe('readSource', () => {
  const dir = mkdtempSync(join(tmpdir(), 'names-src-'));
  const input = join(dir, 'file.xlsx');
  const good = {
    release: '1/2026',
    title: 'כותרת',
    file: 'file.xlsx',
    retrieved: '2026-01-02',
    url: 'https://x.test/f.xlsx',
    licenseUrl: 'https://x.test/license',
  };
  const write = (o: unknown) => writeFileSync(join(dir, 'source.json'), JSON.stringify(o));

  it('explains how to fix a missing source.json', () => {
    expect(() => readSource(join(mkdtempSync(join(tmpdir(), 'names-none-')), 'a.xlsx'))).toThrow(
      /source\.json is missing.*README/,
    );
  });

  it('accepts a complete record', () => {
    write(good);
    expect(readSource(input).retrieved).toBe('2026-01-02');
  });

  it('rejects a missing field, a bad date, and a file name that does not match', () => {
    write({ ...good, url: '' });
    expect(() => readSource(input)).toThrow(/"url" is missing/);
    write({ ...good, retrieved: '2 January 2026' });
    expect(() => readSource(input)).toThrow(/YYYY-MM-DD/);
    write({ ...good, file: 'other.xlsx' });
    expect(() => readSource(input)).toThrow(/does not match/);
  });

  it('the committed source.json matches the committed workbook', () => {
    copyFileSync('data/raw/source.json', join(dir, 'source.json'));
    expect(readSource('data/raw/11_25_391t1.xlsx').file).toBe('11_25_391t1.xlsx');
  });
});

import { describe, expect, it } from 'vitest';
import type { MetricsConfig } from '../scripts/config';
import type { NameSeries } from '../scripts/lib/aggregate';
import { computeMetrics, sliceMetrics, sparkline } from '../scripts/lib/metrics';

const config: MetricsConfig = {
  windowYears: 3,
  minPeakCount: 30,
  fallRatio: 0.2,
  riseRatio: 5,
  moversPerSlice: 10,
};
const years = Array.from({ length: 12 }, (_, i) => 2000 + i);
const births = years.map(() => 1000);
const make = (name: string, n: number[], s: number[] = n.map(() => 0)): NameSeries => ({
  name,
  total: n.reduce((a, b) => a + b, 0),
  residual: 0,
  n,
  s,
});

describe('computeMetrics', () => {
  it('tags a vanished name as a faller', () => {
    const m = computeMetrics(
      make(
        'ישן',
        [100, 90, 80, 50, 30, 10, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
      ),
      births,
      years,
      config,
    )!;
    expect(m.tag).toBe('faller');
    expect(m.vanished).toBe(true);
    expect(m.peakYear).toBe(2000);
    expect(m.change).toBeLessThanOrEqual(-0.8);
  });

  it('tags a surged name as a riser', () => {
    const m = computeMetrics(
      make('חדש', [0, 0, 0, 0, 0, 5, 20, 40, 60, 80, 90, 100]),
      births,
      years,
      config,
    )!;
    expect(m.tag).toBe('riser');
    expect(m.vanished).toBe(false);
    expect(m.peakYear).toBe(2011);
    expect(m.change).toBeGreaterThan(4);
  });

  it('leaves a stable name untagged', () => {
    const m = computeMetrics(make('יציב', Array(12).fill(100)), births, years, config)!;
    expect(m.tag).toBeNull();
    expect(m.change).toBeCloseTo(0);
  });

  it('excludes names that never reached the minimum peak count', () => {
    expect(
      computeMetrics(make('נדיר', [20, 25, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0]), births, years, config),
    ).toBeNull();
  });

  it('counts suppressed cells at the estimate rather than as zero', () => {
    const m = computeMetrics(
      make('מוסתר', [100, 90, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
      births,
      years,
      config,
    )!;
    expect(m.recentShare).toBeCloseTo(2.5 / 1000);
  });
});

describe('sliceMetrics', () => {
  it('keeps only names that pass the rarity filter', () => {
    const slice = {
      births,
      names: new Map([
        ['a', make('a', Array(12).fill(100))],
        ['b', make('b', Array(12).fill(1))],
      ]),
    };
    expect([...sliceMetrics(slice, years, config).keys()]).toEqual(['a']);
  });
});

describe('sparkline', () => {
  it('bins the share history and scales the highest bin to 100', () => {
    const spark = sparkline(make('א', [0, 0, 0, 0, 50, 50, 50, 50, 100, 100, 100, 100]), births);
    expect(spark).toEqual([0, 50, 100]);
  });

  it('is all zeros for a name with no births', () => {
    expect(sparkline(make('ב', Array(12).fill(0)), births)).toEqual([0, 0, 0]);
  });
});

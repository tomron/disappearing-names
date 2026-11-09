import { describe, expect, it } from 'vitest';
import type { Mover } from '../src/data/types';
import { addName, filterMovers, restrictYears, sortMovers } from '../src/lib/compare';

const mover = (name: string, peakYear: number, peakCount: number, change: number): Mover => ({
  name,
  peakYear,
  peakCount,
  baselineShare: 0.01,
  recentShare: 0.001,
  change,
  vanished: false,
  spark: [],
});
const rows = [
  mover('ב', 1962, 400, -0.9),
  mover('א', 1975, 50, -0.95),
  mover('ג', 1990, 900, -0.8),
];

describe('filterMovers', () => {
  it('keeps names whose peak is in the decade range', () => {
    expect(filterMovers(rows, { from: 1970, to: 1980, minPeak: 0 }).map((m) => m.name)).toEqual([
      'א',
    ]);
    expect(filterMovers(rows, { from: 1970, to: null, minPeak: 0 }).map((m) => m.name)).toEqual([
      'א',
      'ג',
    ]);
  });
  it('applies the minimum peak count', () => {
    expect(filterMovers(rows, { from: null, to: null, minPeak: 100 }).map((m) => m.name)).toEqual([
      'ב',
      'ג',
    ]);
  });
});

describe('sortMovers', () => {
  it('sorts by a numeric column in both directions', () => {
    expect(sortMovers(rows, 'peakYear', 'asc').map((m) => m.name)).toEqual(['ב', 'א', 'ג']);
    expect(sortMovers(rows, 'peakYear', 'desc').map((m) => m.name)).toEqual(['ג', 'א', 'ב']);
  });
  it('sorts by name and does not mutate its input', () => {
    expect(sortMovers(rows, 'name', 'asc').map((m) => m.name)).toEqual(['א', 'ב', 'ג']);
    expect(rows.map((m) => m.name)).toEqual(['ב', 'א', 'ג']);
  });
});

describe('addName', () => {
  it('adds names up to the limit, then refuses', () => {
    let names: string[] = [];
    for (const n of ['א', 'ב', 'ג']) names = addName(names, n, 3).names;
    expect(names).toEqual(['א', 'ב', 'ג']);
    expect(addName(names, 'ד', 3)).toEqual({ names, rejected: 'limit' });
  });
  it('refuses duplicates', () => {
    expect(addName(['א'], 'א', 5).rejected).toBe('duplicate');
  });
});

describe('restrictYears', () => {
  const series = [{ name: 'x', values: [1, 2, 3, 4], suppressed: [false, true, false, false] }];
  it('cuts years and every series to the range', () => {
    const r = restrictYears([2000, 2001, 2002, 2003], series, 2001, 2002);
    expect(r.years).toEqual([2001, 2002]);
    expect(r.series[0].values).toEqual([2, 3]);
    expect(r.series[0].suppressed).toEqual([true, false]);
  });
  it('leaves an open end unrestricted', () => {
    expect(restrictYears([2000, 2001, 2002, 2003], series, null, 2001).years).toEqual([2000, 2001]);
  });
});

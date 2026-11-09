import type { Meta, NameEntry, SliceKey, SliceSeries } from '../src/data/types';

export const YEARS = Array.from({ length: 20 }, (_, i) => 2000 + i);

export const meta: Meta = {
  release: '391/2025',
  cbs: {
    release: '391/2025',
    title: 'כותרת הקובץ',
    file: '11_25_391t1.xlsx',
    retrieved: '2026-11-09',
    url: 'https://example.test/file.xlsx',
    licenseUrl: 'https://example.test/license',
  },
  source: 'CBS',
  firstYear: 2000,
  lastYear: 2019,
  builtAt: '2026-01-01T00:00:00.000Z',
  sectors: ['jewish', 'muslim', 'christian', 'druze'],
  sexes: ['F', 'M'],
  slices: [],
  suppressedMax: 4,
  publishedMin: 5,
  denominator: 'test',
  config: { windowYears: 3, minPeakCount: 30, fallRatio: 0.2, riseRatio: 5, moversPerSlice: 10 },
  births: new Proxy({} as Meta['births'], { get: () => YEARS.map(() => 1000) }),
};

export const series = (n: number[], s: number[] = n.map(() => 0)): SliceSeries => ({ n, s });
const pad = (xs: number[]) => [...xs, ...Array(YEARS.length - xs.length).fill(0)];

/** Peaked in 2002 and gone (suppressed) by 2019. */
export const fallen: NameEntry = {
  total: 900,
  residual: 0,
  slices: {
    'all/all': series(pad([100, 200, 300, 200, 100, 50, 25, 10]), [
      ...Array(8).fill(0),
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
    ]),
    'jewish/F': series(pad([100, 150, 200, 150, 100, 50, 25, 10])),
    'muslim/F': series(pad([0, 50, 100, 50])),
  },
};

/** Barely there until 2010, at its peak in 2019. */
export const risen: NameEntry = {
  total: 500,
  residual: 0,
  slices: { 'all/all': series([...Array(10).fill(0), 10, 20, 40, 60, 80, 90, 100, 110, 120, 130]) },
};

export const slicesOf = (e: NameEntry) => Object.keys(e.slices) as SliceKey[];

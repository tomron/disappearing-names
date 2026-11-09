import { beforeAll, describe, expect, it } from 'vitest';
import {
  aggregate,
  reconcileTotals,
  residual,
  SLICE_KEYS,
  SUPPRESSED_ESTIMATE,
  type Aggregated,
} from '../scripts/lib/aggregate';
import { parseCbsWorkbook, type NameRow, type ParsedWorkbook } from '../scripts/lib/parse-cbs';

const row = (over: Partial<NameRow>): NameRow => ({
  sector: 'jewish',
  sex: 'F',
  name: 'מאיה',
  total: 0,
  cells: [],
  ...over,
});

const small: ParsedWorkbook = {
  years: [2000, 2001, 2002],
  rows: [
    row({ sector: 'jewish', sex: 'F', total: 12, cells: [10, 'S', 0] }),
    row({ sector: 'muslim', sex: 'F', total: 11, cells: [5, 'S', 'S'] }),
    row({ sector: 'jewish', sex: 'M', total: 9, cells: [6, 0, 'S'] }),
  ],
};

describe('aggregate (synthetic)', () => {
  const agg = aggregate(small);
  const series = (key: string) => agg.slices.get(key as never)!.names.get('מאיה')!;

  it('creates all 15 slices', () => {
    expect(agg.slices.size).toBe(15);
    expect(SLICE_KEYS).toHaveLength(15);
  });

  it('aggregates equal the sum of their parts', () => {
    expect(series('all/all').n).toEqual([21, 0, 0]);
    expect(series('all/F').n).toEqual([15, 0, 0]);
    expect(series('jewish/all').n).toEqual([16, 0, 0]);
    expect(series('all/all').total).toBe(32);
  });

  it('keeps suppressed cells out of the published count and never as zero', () => {
    expect(series('jewish/F').s).toEqual([0, 1, 0]);
    expect(series('all/all').s).toEqual([0, 2, 2]);
    // a suppressed year is distinguishable from a true zero year
    expect(series('jewish/F').n[1]).toBe(0);
    expect(series('jewish/F').s[1]).toBe(1);
    expect(series('jewish/F').n[2] + series('jewish/F').s[2]).toBe(0);
  });

  it('estimates yearly births as published plus 2.5 per suppressed cell', () => {
    expect(agg.slices.get('all/all')!.births).toEqual([
      21,
      2 * SUPPRESSED_ESTIMATE,
      2 * SUPPRESSED_ESTIMATE,
    ]);
    expect(agg.slices.get('jewish/F')!.births).toEqual([10, 2.5, 0]);
  });
});

describe('reconcileTotals (synthetic)', () => {
  it('accepts totals within published + 1..4 per suppressed cell', () => {
    const r = reconcileTotals(small.rows);
    expect(r.belowLowerBound).toHaveLength(0);
    expect(r.withResidual).toHaveLength(0);
  });
  it('flags a total below what the cells require', () => {
    const bad = row({ total: 10, cells: [10, 'S', 0] });
    expect(reconcileTotals([bad]).belowLowerBound).toEqual([bad]);
  });
  it('reports, but does not reject, a total with unexplained births', () => {
    const extra = row({ total: 99, cells: [10, 'S', 0] });
    const r = reconcileTotals([extra]);
    expect(r.belowLowerBound).toHaveLength(0);
    expect(r.withResidual).toEqual([extra]);
    expect(residual(extra)).toBe(85);
  });
});

describe('aggregate (real CBS file)', () => {
  let wb: ParsedWorkbook;
  let agg: Aggregated;
  beforeAll(async () => {
    wb = await parseCbsWorkbook('data/raw/11_25_391t1.xlsx');
    agg = aggregate(wb);
  }, 60_000);

  it('all/all published counts equal the sum of the eight sheets', () => {
    const total = (k: string) =>
      [...agg.slices.get(k as never)!.names.values()].reduce(
        (a, s) => a + s.n.reduce((x, y) => x + y, 0),
        0,
      );
    const sectors = ['jewish', 'muslim', 'christian', 'druze'];
    const parts = sectors.flatMap((s) => [`${s}/F`, `${s}/M`]).reduce((a, k) => a + total(k), 0);
    expect(total('all/all')).toBe(parts);
  });

  it('no total is below its own yearly cells, and few have a residual', () => {
    const { rows, belowLowerBound, withResidual } = reconcileTotals(wb.rows);
    expect(belowLowerBound).toHaveLength(0);
    expect(withResidual.length / rows).toBeLessThan(0.05);
  });
});

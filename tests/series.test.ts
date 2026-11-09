import { describe, expect, it } from 'vitest';
import { buildSeries } from '../src/lib/series';
import { fallen, meta, YEARS } from './fixtures';

const base = { mode: 'count' as const, sector: 'all' as const, sex: 'all' as const, split: false };

describe('buildSeries', () => {
  it('plots the selected slice, with suppressed years flagged and estimated', () => {
    const { chart } = buildSeries('שם', fallen, meta, base);
    expect(chart).toHaveLength(1);
    expect(chart[0].name).toBe('שם');
    expect(chart[0].values[2]).toBe(300);
    expect(chart[0].values[17]).toBe(2.5); // suppressed, drawn at the estimate
    expect(chart[0].suppressed[17]).toBe(true);
    expect(chart[0].suppressed[2]).toBe(false);
    expect(chart[0].values).toHaveLength(YEARS.length);
  });

  it('changes the plotted series when the sector or sex filter changes', () => {
    const all = buildSeries('שם', fallen, meta, base).chart[0].values;
    const jewish = buildSeries('שם', fallen, meta, { ...base, sector: 'jewish', sex: 'F' }).chart[0]
      .values;
    expect(jewish).not.toEqual(all);
    expect(jewish[2]).toBe(200);
  });

  it('yields no series for a slice where the name does not exist', () => {
    expect(buildSeries('שם', fallen, meta, { ...base, sector: 'druze' }).chart).toEqual([]);
  });

  it('splits into one line per sector that has data', () => {
    const { chart, slices } = buildSeries('שם', fallen, meta, { ...base, sex: 'F', split: true });
    expect(chart.map((s) => s.name)).toEqual(['יהודים', 'מוסלמים']);
    expect(slices).toEqual(['jewish/F', 'muslim/F']);
  });

  it('converts to share of births in share mode', () => {
    const { chart } = buildSeries('שם', fallen, meta, { ...base, mode: 'share' });
    expect(chart[0].values[2]).toBeCloseTo(0.3); // 300 of 1000 births
  });
});

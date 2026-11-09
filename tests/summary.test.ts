import { describe, expect, it } from 'vitest';
import { summarize, trajectory } from '../src/lib/summary';
import { fallen, meta, risen, series } from './fixtures';

const ctx = { sector: 'all' as const, sex: 'all' as const, meta };

describe('trajectory', () => {
  it('finds the peak and the last published year', () => {
    const tr = trajectory(fallen.slices['all/all']!, meta)!;
    expect(tr.peakYear).toBe(2002);
    expect(tr.peakCount).toBe(300);
    expect(tr.lastPublishedYear).toBe(2007);
    expect(tr.currentPublished).toBe(false);
    expect(tr.atPeak).toBe(false);
  });
});

describe('summarize', () => {
  it('describes a fallen name with its peak and the percentage drop', () => {
    const text = summarize('ישן', fallen.slices['all/all']!, ctx);
    expect(text).toContain('ישן');
    expect(text).toContain('השיא היה ב-2002 עם 300 לידות');
    expect(text).toContain('ירד מתחת לסף הפרסום');
    expect(text).toContain('2007');
    expect(text).toContain('ירידה של 99% מהשיא'); // 2.5 of 300 births remain
  });

  it('describes a risen name as rising', () => {
    const text = summarize('חדש', risen.slices['all/all']!, ctx);
    expect(text).toContain('שם בעלייה מאז 2010');
    expect(text).toContain('השיא היה ב-2019 עם 130 לידות');
    expect(text).not.toContain('ירידה');
  });

  it('reports a published recent count when the name is still given', () => {
    const slice = series([
      0, 300, 200, 100, 80, 60, 40, 30, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
    ]);
    expect(summarize('יציב', slice, ctx)).toContain('ב-2019 נולדו 20');
  });

  it('says so when no year reached the publication threshold', () => {
    expect(summarize('נדיר', series(Array(20).fill(0)), ctx)).toContain('לא פורסמו שנים');
  });

  it('warns that the peak may predate the data when the residual is large', () => {
    const slice = fallen.slices['all/all']!;
    expect(summarize('ישן', slice, { ...ctx, residual: 200 })).toContain('לפני 2000');
    expect(summarize('ישן', slice, { ...ctx, residual: 10 })).not.toContain('לפני 2000');
  });

  it('names the sector and sex in the description', () => {
    expect(
      summarize('ישן', fallen.slices['jewish/F']!, { ...ctx, sector: 'jewish', sex: 'F' }),
    ).toContain('בנות, יהודים');
  });
});

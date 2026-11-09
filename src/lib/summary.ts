import type { Meta, SectorKey, SexKey, SliceSeries } from '../data/types';
import { formatNumber, formatPercent, sectorLabel, sexLabel } from './labels';
import { estimated } from './series';

export interface Trajectory {
  peakYear: number;
  peakCount: number;
  firstYear: number | null;
  lastPublishedYear: number | null;
  currentCount: number;
  currentPublished: boolean;
  /** 1 - current / peak, so 0.9 is a 90% fall. */
  fallFromPeak: number;
  /** True when the peak is in the most recent window, so the name is at or near its high. */
  atPeak: boolean;
}

const RECENT_YEARS = 10;

export function trajectory(slice: SliceSeries, meta: Meta): Trajectory | null {
  const est = estimated(slice);
  const years = est.map((_, i) => meta.firstYear + i);
  const peakCount = Math.max(...est);
  if (peakCount <= 0) return null;
  const peakIndex = est.indexOf(peakCount);
  const published = slice.n.map((n) => n > 0);
  const last = published.lastIndexOf(true);
  const first = published.indexOf(true);
  const current = est[est.length - 1];
  return {
    peakYear: years[peakIndex],
    peakCount,
    firstYear: first === -1 ? null : years[first],
    lastPublishedYear: last === -1 ? null : years[last],
    currentCount: current,
    currentPublished: slice.n[slice.n.length - 1] > 0,
    fallFromPeak: 1 - current / peakCount,
    atPeak: years[peakIndex] > meta.lastYear - RECENT_YEARS,
  };
}

export interface SummaryContext {
  sector: SectorKey;
  sex: SexKey;
  meta: Meta;
  /** Births in the name's all-years total that the yearly cells cannot account for. */
  residual?: number;
}

/** A plain-language Hebrew description of one series, also used as the chart's text alternative. */
export function summarize(name: string, slice: SliceSeries, ctx: SummaryContext): string {
  const tr = trajectory(slice, ctx.meta);
  const who = `${sexLabel[ctx.sex]}, ${sectorLabel[ctx.sector]}`;
  if (!tr) return `${name} (${who}): לא פורסמו שנים עם 5 לידות או יותר.`;

  const peak = `השיא היה ב-${tr.peakYear} עם ${formatNumber(tr.peakCount)} לידות`;
  let text: string;
  if (tr.atPeak) {
    const from = tr.firstYear === null ? '' : ` מאז ${tr.firstYear}`;
    text = `${name} (${who}): שם בעלייה${from}. ${peak}.`;
  } else {
    const now = tr.currentPublished
      ? `ב-${ctx.meta.lastYear} נולדו ${formatNumber(tr.currentCount)}`
      : tr.lastPublishedYear === null
        ? `לא פורסם באף שנה`
        : `ב-${ctx.meta.lastYear} ירד מתחת לסף הפרסום (פחות מ-5 לידות); הפעם האחרונה שפורסם: ${tr.lastPublishedYear}`;
    text = `${name} (${who}): ${peak}. ${now}, ירידה של ${formatPercent(tr.fallFromPeak)} מהשיא.`;
  }
  // Births outside 1949-2024 inflate the all-years total; a residual of about half a peak year
  // or more means the real peak may predate the data.
  if (ctx.residual !== undefined && ctx.residual >= tr.peakCount / 2) {
    text += ` ייתכן שהשיא היה לפני ${ctx.meta.firstYear}.`;
  }
  return text;
}

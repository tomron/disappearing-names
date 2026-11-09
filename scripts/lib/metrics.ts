import type { MetricsConfig } from '../config';
import { SUPPRESSED_ESTIMATE, type NameSeries, type Slice } from './aggregate';

export interface Metrics {
  name: string;
  total: number;
  /** Year of the highest estimated yearly count, and that count. */
  peakYear: number;
  peakCount: number;
  /** Mean share of births over the best (peak) window, and over the most recent window. */
  peakShare: number;
  recentShare: number;
  /** Reference share the recent window is compared against (peak window for fallers). */
  baselineShare: number;
  /** recentShare / baselineShare - 1, e.g. -0.9 for a 90% fall. */
  change: number;
  tag: 'riser' | 'faller' | null;
  /** True when every year in the recent window has no published count (zero or suppressed). */
  vanished: boolean;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Estimated count in year i: published births plus the suppressed estimate. */
export const estimatedCount = (s: NameSeries, i: number) => s.n[i] + s.s[i] * SUPPRESSED_ESTIMATE;

export function computeMetrics(
  series: NameSeries,
  births: number[],
  years: number[],
  config: MetricsConfig,
): Metrics | null {
  const w = config.windowYears;
  const count = years.map((_, i) => estimatedCount(series, i));
  const peakCount = Math.max(...count);
  if (peakCount < config.minPeakCount || years.length < 2 * w) return null;

  const share = count.map((c, i) => (births[i] > 0 ? c / births[i] : 0));
  const windowMeans: number[] = [];
  for (let i = 0; i + w <= years.length; i++) windowMeans.push(mean(share.slice(i, i + w)));

  const recentStart = years.length - w;
  const recentShare = windowMeans[recentStart];
  const peakShare = Math.max(...windowMeans);
  const earlierMin = Math.min(...windowMeans.slice(0, recentStart - w + 1));

  // One yearly birth is the floor, so a name that was absent earlier still has a finite ratio.
  const floor = 1 / Math.max(...births);
  const riseBaseline = Math.max(earlierMin, floor);

  let tag: Metrics['tag'] = null;
  let baselineShare = peakShare;
  if (recentShare <= peakShare * config.fallRatio) {
    tag = 'faller';
  } else if (recentShare >= riseBaseline * config.riseRatio) {
    tag = 'riser';
    baselineShare = riseBaseline;
  }

  const vanished = series.n.slice(recentStart).every((n) => n === 0);
  const peakIndex = count.indexOf(peakCount);
  return {
    name: series.name,
    total: series.total,
    peakYear: years[peakIndex],
    peakCount,
    peakShare,
    recentShare,
    baselineShare,
    change: recentShare / baselineShare - 1,
    tag,
    vanished,
  };
}

export function sliceMetrics(
  slice: Slice,
  years: number[],
  config: MetricsConfig,
): Map<string, Metrics> {
  const out = new Map<string, Metrics>();
  for (const series of slice.names.values()) {
    const m = computeMetrics(series, slice.births, years, config);
    if (m) out.set(series.name, m);
  }
  return out;
}

/**
 * A tiny shape of a name's history for card sparklines: mean share of births per bin of years,
 * scaled so the highest bin is 100. Suppressed years count at the estimate, as in the metrics.
 */
export function sparkline(series: NameSeries, births: number[], binYears = 4): number[] {
  const share = births.map((b, i) => (b > 0 ? estimatedCount(series, i) / b : 0));
  const bins: number[] = [];
  for (let i = 0; i < share.length; i += binYears) bins.push(mean(share.slice(i, i + binYears)));
  const max = Math.max(...bins);
  return bins.map((v) => (max > 0 ? Math.round((v / max) * 100) : 0));
}

import type { ChartSeries } from '../components/Chart';
import type { Meta, NameEntry, SectorKey, SexKey, SliceKey, SliceSeries } from '../data/types';
import { sectorLabel } from './labels';

/** Births assumed for a year CBS suppressed (it publishes `..` for 1 to 4). */
export const SUPPRESSED_ESTIMATE = 2.5;

export type Mode = 'count' | 'share';

export interface SeriesOptions {
  mode: Mode;
  sector: SectorKey;
  sex: SexKey;
  /** Draw one line per sector instead of a single line for the chosen sector. */
  split: boolean;
}

export interface BuiltSeries {
  chart: ChartSeries[];
  /** The slice behind each chart series, in the same order. */
  slices: SliceKey[];
}

export const estimated = (s: SliceSeries): number[] =>
  s.n.map((n, i) => n + s.s[i] * SUPPRESSED_ESTIMATE);

export function buildSeries(
  name: string,
  entry: NameEntry,
  meta: Meta,
  { mode, sector, sex, split }: SeriesOptions,
): BuiltSeries {
  const keys: SliceKey[] = split
    ? meta.sectors.map((s): SliceKey => `${s}/${sex}`)
    : [`${sector}/${sex}`];
  const chart: ChartSeries[] = [];
  const slices: SliceKey[] = [];
  for (const key of keys) {
    const slice = entry.slices[key];
    if (!slice) continue;
    const est = estimated(slice);
    chart.push({
      name: split ? sectorLabel[key.split('/')[0] as SectorKey] : name,
      values: mode === 'share' ? est.map((v, i) => v / meta.births[key][i]) : est,
      suppressed: slice.s.map((s, i) => s > 0 && slice.n[i] === 0),
    });
    slices.push(key);
  }
  return { chart, slices };
}

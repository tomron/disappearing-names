import type { ChartSeries } from '../components/Chart';
import type { Mover } from '../data/types';

export type SortKey = 'name' | 'peakYear' | 'baselineShare' | 'recentShare' | 'change';
export type SortDir = 'asc' | 'desc';

export interface MoverFilter {
  from: number | null;
  to: number | null;
  minPeak: number;
}

/** Keeps names whose peak year is in range and whose highest yearly count is at least `minPeak`. */
export function filterMovers(rows: Mover[], { from, to, minPeak }: MoverFilter): Mover[] {
  return rows.filter(
    (m) =>
      (from === null || m.peakYear >= from) &&
      (to === null || m.peakYear <= to) &&
      m.peakCount >= minPeak,
  );
}

export function sortMovers(rows: Mover[], key: SortKey, dir: SortDir): Mover[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const diff = key === 'name' ? a.name.localeCompare(b.name, 'he') : a[key] - b[key];
    return sign * diff || a.name.localeCompare(b.name, 'he');
  });
}

export type AddResult =
  { names: string[]; rejected: null } | { names: string[]; rejected: 'limit' | 'duplicate' };

export function addName(names: string[], name: string, max: number): AddResult {
  if (names.includes(name)) return { names, rejected: 'duplicate' };
  if (names.length >= max) return { names, rejected: 'limit' };
  return { names: [...names, name], rejected: null };
}

/** Restricts a chart to the years between `from` and `to` (inclusive); null leaves that end open. */
export function restrictYears(
  years: number[],
  series: ChartSeries[],
  from: number | null,
  to: number | null,
): { years: number[]; series: ChartSeries[] } {
  const keep = years.map((y) => (from === null || y >= from) && (to === null || y <= to));
  const pick = <T>(xs: T[]) => xs.filter((_, i) => keep[i]);
  return {
    years: pick(years),
    series: series.map((s) => ({ ...s, values: pick(s.values), suppressed: pick(s.suppressed) })),
  };
}

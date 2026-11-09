import type { Mover } from '../data/types';
import { formatNumber, formatPercent } from './labels';

const DECADES: Record<number, string> = {
  1940: 'שנות הארבעים',
  1950: 'שנות החמישים',
  1960: 'שנות השישים',
  1970: 'שנות השבעים',
  1980: 'שנות השמונים',
  1990: 'שנות התשעים',
  2000: 'שנות האלפיים',
};

export const decadeOf = (year: number) => Math.floor(year / 10) * 10;

/** Plain-language name of the decade a year falls in, for example "שנות השבעים". */
export function decadeLabel(year: number): string {
  const decade = decadeOf(year);
  if (decade === 2010) return 'שנות ה-2010';
  if (decade === 2020) return 'שנות ה-2020';
  return DECADES[decade] ?? `${decade}–${decade + 9}`;
}

export type Section = 'vanished' | 'fell' | 'surged';

export function sectionOf(m: Mover): Section {
  if (m.change > 0) return 'surged';
  return m.vanished ? 'vanished' : 'fell';
}

/** One or two sentences a visitor can read without knowing how change is measured. */
export function cardText(m: Mover, lastYear: number): string {
  const peak = `${formatNumber(m.peakCount)} לידות בשנת השיא ${m.peakYear}`;
  switch (sectionOf(m)) {
    case 'vanished':
      return `הגיע לשיא ב${decadeLabel(m.peakYear)} (${peak}). בשנים האחרונות כבר לא מפורסם.`;
    case 'fell':
      return `הגיע לשיא ב${decadeLabel(m.peakYear)} (${peak}). ירידה של ${formatPercent(-m.change)} מאז.`;
    case 'surged':
      return `עלה פי ${(1 + m.change).toLocaleString('he-IL', { maximumFractionDigits: 1 })} עד ${lastYear}. שיא: ${peak}.`;
  }
}

export interface Selection {
  /** How many cards to show per section. */
  count: number;
  /** Candidates are the `pool` most extreme names; a reshuffle samples from them. */
  pool: number;
}

/** Orders a section by magnitude: biggest change first, ties by how common the name once was. */
export function byMagnitude(a: Mover, b: Mover): number {
  return Math.abs(b.change) - Math.abs(a.change) || b.peakCount - a.peakCount;
}

/**
 * The first view shows the most extreme names. A reshuffle (rng given) samples the same number from
 * a larger pool of extreme names, keeping the strongest ones in play without always repeating them.
 */
export function selectCards(
  movers: Mover[],
  { count, pool }: Selection,
  rng?: () => number,
): Mover[] {
  const sorted = [...movers].sort(byMagnitude);
  if (!rng) return sorted.slice(0, count);
  const candidates = sorted.slice(0, pool);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, count).sort(byMagnitude);
}

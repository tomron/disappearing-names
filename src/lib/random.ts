import type { Mover, Movers, SliceKey } from '../data/types';

export type Pick = Mover & { direction: 'rise' | 'fall' };

/** Picks a random riser or faller from one slice, or null when that slice has none. */
export function pickMover(
  movers: Movers,
  slice: SliceKey,
  rng: () => number = Math.random,
): Pick | null {
  const entry = movers[slice];
  if (!entry) return null;
  const all: Pick[] = [
    ...entry.risers.map((m): Pick => ({ ...m, direction: 'rise' })),
    ...entry.fallers.map((m): Pick => ({ ...m, direction: 'fall' })),
  ];
  return all.length ? all[Math.min(all.length - 1, Math.floor(rng() * all.length))] : null;
}

export function describeMover(m: Pick, lastYear: number): string {
  const pct = `${Math.round(Math.abs(m.change) * 100).toLocaleString('he-IL')}%`;
  return m.direction === 'fall'
    ? `ירידה של ${pct} מהשיא ב-${m.peakYear}${m.vanished ? ' (נעלם)' : ''}`
    : `עלה פי ${(1 + m.change).toLocaleString('he-IL', { maximumFractionDigits: 1 })} עד ${lastYear}`;
}

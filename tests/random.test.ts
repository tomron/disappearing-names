import { describe, expect, it } from 'vitest';
import type { Mover, Movers } from '../src/data/types';
import { describeMover, pickMover } from '../src/lib/random';

const mover = (name: string, change: number, vanished = false): Mover => ({
  name,
  peakYear: 1975,
  peakCount: 500,
  baselineShare: 0.01,
  recentShare: 0.001,
  change,
  vanished,
  spark: [100, 50, 0],
});
const movers = {
  'all/all': {
    risers: [mover('נועם', 20)],
    fallers: [mover('שרון', -0.99), mover('קרן', -0.97, true)],
  },
  'druze/F': { risers: [], fallers: [mover('מנאל', -0.99, true)] },
  'muslim/M': { risers: [], fallers: [] },
} as unknown as Movers;

describe('pickMover', () => {
  it('only ever picks from the requested slice', () => {
    for (let i = 0; i <= 20; i++) {
      const pick = pickMover(movers, 'druze/F', () => i / 20)!;
      expect(pick.name).toBe('מנאל');
      expect(pick.direction).toBe('fall');
    }
  });

  it('can reach every entry, risers and fallers, across the random range', () => {
    const seen = new Set<string>();
    for (const r of [0, 0.34, 0.67, 0.999]) seen.add(pickMover(movers, 'all/all', () => r)!.name);
    expect(seen).toEqual(new Set(['נועם', 'שרון', 'קרן']));
  });

  it('returns null when the slice has nothing qualifying', () => {
    expect(pickMover(movers, 'muslim/M')).toBeNull();
    expect(pickMover(movers, 'jewish/M')).toBeNull();
  });
});

describe('describeMover', () => {
  it('states direction and magnitude', () => {
    expect(describeMover({ ...mover('שרון', -0.99), direction: 'fall' }, 2024)).toBe(
      'ירידה של 99% מהשיא ב-1975',
    );
    expect(describeMover({ ...mover('קרן', -0.97, true), direction: 'fall' }, 2024)).toContain(
      '(נעלם)',
    );
    expect(describeMover({ ...mover('נועם', 20), direction: 'rise' }, 2024)).toContain('עלה פי 21');
  });
});

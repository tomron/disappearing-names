import { describe, expect, it } from 'vitest';
import type { Mover } from '../src/data/types';
import { byMagnitude, cardText, decadeLabel, sectionOf, selectCards } from '../src/lib/cards';

const mover = (over: Partial<Mover>): Mover => ({
  name: 'שם',
  peakYear: 1974,
  peakCount: 1362,
  baselineShare: 0.01,
  recentShare: 0.0001,
  change: -0.98,
  vanished: false,
  spark: [100, 50, 0],
  ...over,
});

describe('decadeLabel', () => {
  it('names decades in Hebrew', () => {
    expect(decadeLabel(1951)).toBe('שנות החמישים');
    expect(decadeLabel(1979)).toBe('שנות השבעים');
    expect(decadeLabel(2003)).toBe('שנות האלפיים');
    expect(decadeLabel(2015)).toBe('שנות ה-2010');
  });
});

describe('cardText', () => {
  it('says a vanished name peaked in a decade and is no longer published', () => {
    const text = cardText(mover({ vanished: true, change: -1, peakYear: 1953 }), 2024);
    expect(text).toContain('שנות החמישים');
    expect(text).toContain('כבר לא מפורסם');
  });

  it('states the size of the fall for a name that is still given', () => {
    const text = cardText(mover({}), 2024);
    expect(text).toContain('שנות השבעים');
    expect(text).toContain('ירידה של 98%');
    expect(text).not.toContain('לא מפורסם');
  });

  it('states the multiple for a surging name', () => {
    expect(cardText(mover({ change: 9, peakYear: 2022 }), 2024)).toContain('עלה פי 10 עד 2024');
  });
});

describe('sectionOf', () => {
  it('separates vanished, fallen and surged names', () => {
    expect(sectionOf(mover({ vanished: true }))).toBe('vanished');
    expect(sectionOf(mover({}))).toBe('fell');
    expect(sectionOf(mover({ change: 4 }))).toBe('surged');
  });
});

describe('selectCards', () => {
  const many = Array.from({ length: 30 }, (_, i) =>
    mover({ name: `n${i}`, change: -(0.5 + i / 100), peakCount: 100 + i }),
  );

  it('orders by magnitude of change, then by how common the name was', () => {
    const tie = [
      mover({ name: 'a', change: -1, peakCount: 10 }),
      mover({ name: 'b', change: -1, peakCount: 90 }),
    ];
    expect([...tie].sort(byMagnitude).map((m) => m.name)).toEqual(['b', 'a']);
    const top = selectCards(many, { count: 5, pool: 20 });
    expect(top.map((m) => m.name)).toEqual(['n29', 'n28', 'n27', 'n26', 'n25']);
  });

  it('a reshuffle samples only from the pool of the most extreme names', () => {
    let seed = 7;
    const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pool = new Set(selectCards(many, { count: 20, pool: 20 }).map((m) => m.name));
    for (let i = 0; i < 20; i++) {
      const picked = selectCards(many, { count: 5, pool: 20 }, rng);
      expect(picked).toHaveLength(5);
      for (const m of picked) expect(pool.has(m.name)).toBe(true);
    }
  });

  it('a reshuffle can differ from the top selection', () => {
    let seed = 3;
    const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const top = selectCards(many, { count: 5, pool: 20 })
      .map((m) => m.name)
      .join();
    const results = new Set(
      Array.from({ length: 10 }, () =>
        selectCards(many, { count: 5, pool: 20 }, rng)
          .map((m) => m.name)
          .join(),
      ),
    );
    expect([...results].some((r) => r !== top)).toBe(true);
  });

  it('returns what exists when there are fewer names than requested', () => {
    expect(selectCards(many.slice(0, 2), { count: 12, pool: 48 })).toHaveLength(2);
    expect(selectCards([], { count: 12, pool: 48 }, Math.random)).toEqual([]);
  });
});

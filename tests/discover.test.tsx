// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mover, Movers } from '../src/data/types';

const mover = (name: string, change: number, vanished = false, peakYear = 1974): Mover => ({
  name,
  peakYear,
  peakCount: 500,
  baselineShare: 0.01,
  recentShare: 0.0001,
  change,
  vanished,
  spark: [100, 60, 20, 0],
});
// 20 vanished names in the all-population slice so that a reshuffle has something to choose from
const vanishedAll = Array.from({ length: 20 }, (_, i) => mover(`ישן${i}`, -1, true));
const movers = {
  'all/all': {
    risers: [mover('חדש', 9, false, 2022)],
    fallers: [...vanishedAll, mover('יורד', -0.9, false, 1985)],
  },
  'druze/all': { risers: [], fallers: [mover('דרוזי', -1, true, 1962)] },
} as unknown as Movers;

vi.mock('../src/data/store', () => ({
  store: {
    movers: async () => movers,
    meta: async () => ({ release: '391/2025', firstYear: 1949, lastYear: 2024 }),
    index: async () => [],
    series: async () => null,
  },
}));

const { Discover } = await import('../src/views/Discover');
const { route, navigate } = await import('../src/router');
const { sector, sex } = await import('../src/state/filters');

const cardNames = (section: string) =>
  within(screen.getByRole('region', { name: section }))
    .queryAllByRole('link')
    .map((a) => a.querySelector('.card-name')!.textContent);

beforeEach(() => {
  sector.value = 'all';
  sex.value = 'all';
  navigate('discover');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Discover view', () => {
  it('shows vanished, fallen and surged sections ordered by magnitude', async () => {
    render(<Discover />);
    await screen.findByText(/שמות שנעלמו/);
    expect(cardNames('📉 שמות שנעלמו')).toHaveLength(12);
    expect(cardNames('📉 שמות שירדו בחדות')).toEqual(['יורד']);
    expect(cardNames('📈 שמות שזינקו')).toEqual(['חדש']);
  });

  it('uses the selected sector slice for its cards', async () => {
    render(<Discover />);
    await screen.findByText(/שמות שנעלמו/);
    fireEvent.click(screen.getByLabelText('דרוזים'));
    await waitFor(() => expect(cardNames('📉 שמות שנעלמו')).toEqual(['דרוזי']));
    expect(cardNames('📈 שמות שזינקו')).toEqual([]);
    expect(screen.getAllByText('אין שמות כאלה בסינון הזה.').length).toBeGreaterThan(0);
  });

  it('filters by peak decade', async () => {
    render(<Discover />);
    await screen.findByText(/שמות שנעלמו/);
    fireEvent.click(screen.getByLabelText('שנות השמונים'));
    await waitFor(() => expect(cardNames('📉 שמות שירדו בחדות')).toEqual(['יורד']));
    expect(cardNames('📉 שמות שנעלמו')).toEqual([]);
  });

  it('reshuffle changes which names are shown', async () => {
    render(<Discover />);
    await screen.findByText(/שמות שנעלמו/);
    const before = cardNames('📉 שמות שנעלמו');
    // descending random values pick the last names of the shuffled pool: a different set
    let n = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => 0.1 + (n++ % 7) / 10);
    fireEvent.click(screen.getByRole('button', { name: /ערבבו מחדש/ }));
    await waitFor(() => expect(cardNames('📉 שמות שנעלמו')).not.toEqual(before));
    expect(cardNames('📉 שמות שנעלמו')).toHaveLength(12);
  });

  it('opens the name in the explorer with the active filters', async () => {
    render(<Discover />);
    await screen.findByText(/שמות שנעלמו/);
    fireEvent.click(screen.getByLabelText('דרוזים'));
    await waitFor(() => expect(cardNames('📉 שמות שנעלמו')).toEqual(['דרוזי']));
    fireEvent.click(
      within(screen.getByRole('region', { name: '📉 שמות שנעלמו' })).getByRole('link'),
    );
    expect(route.value.view).toBe('explore');
    expect(route.value.params.get('name')).toBe('דרוזי');
    expect(route.value.params.get('sector')).toBe('druze');
  });
});

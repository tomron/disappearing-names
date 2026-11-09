// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/data/store', () => ({
  store: {
    meta: async () => ({
      release: '391/2025',
      firstYear: 1949,
      lastYear: 2024,
      cbs: {
        release: '391/2025',
        title: 'השמות הנוכחיים של ילידי 1949-2024',
        file: '11_25_391t1.xlsx',
        retrieved: '2026-11-09',
        url: 'https://www.cbs.gov.il/file.xlsx',
        licenseUrl: 'https://www.cbs.gov.il/license',
      },
    }),
    index: async () => [],
    movers: async () => ({}),
    series: async () => null,
  },
}));

const { App } = await import('../src/App');
const { navigate } = await import('../src/router');

afterEach(cleanup);

describe('Hebrew RTL shell', () => {
  it.each(['explore', 'discover', 'compare'] as const)(
    'shows the CBS attribution and below-5 note on the %s view',
    async (view) => {
      navigate(view);
      render(<App />);
      expect(screen.getByText(/הלשכה המרכזית לסטטיסטיקה/)).toBeTruthy();
      expect(screen.getByText(/ל-5 ילדים/)).toBeTruthy();
      expect(await screen.findByText(/391\/2025/)).toBeTruthy(); // release arrives from meta.json
    },
  );

  it('credits CBS as its license asks: name, file title, retrieval date, links, no endorsement', async () => {
    navigate('explore');
    render(<App />);
    const credit = await screen.findByText(/נשאב מאתר הלמ"ס/);
    expect(credit.textContent).toContain('הלשכה המרכזית לסטטיסטיקה (הלמ"ס)');
    expect(credit.textContent).toContain('השמות הנוכחיים של ילידי 1949-2024');
    expect(credit.textContent).toContain('2026'); // retrieval date
    const links = [...credit.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['https://www.cbs.gov.il/file.xlsx', 'https://www.cbs.gov.il/license']);
    expect(screen.getByText(/אינו מטעם הלמ"ס ואינו מאושר על ידה/)).toBeTruthy();
  });

  it('marks the current view in the navigation', () => {
    navigate('discover');
    render(<App />);
    const current = screen.getByRole('link', { current: 'page' });
    expect(current.textContent).toBe('גלו שמות');
    expect(
      screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/')),
    ).toHaveLength(3);
  });

  it('has only Hebrew visible UI strings in the navigation', () => {
    navigate('explore');
    render(<App />);
    for (const a of screen.getByRole('navigation').querySelectorAll('a')) {
      expect(a.textContent).toMatch(/[֐-׿]/);
    }
  });
});

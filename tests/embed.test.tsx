// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/data/store', () => ({
  store: {
    meta: async () => ({ release: '391/2025', firstYear: 1949, lastYear: 2024 }),
    index: async () => [['שרון', 100, 1]],
    movers: async () => ({}),
    series: async () => null,
  },
}));

afterEach(() => {
  cleanup();
  history.replaceState(null, '', '/');
  vi.resetModules();
});

async function open(url: string) {
  history.replaceState(null, '', url);
  vi.resetModules(); // the router reads `embed` from the URL once, when it is first imported
  const { App } = await import('../src/App');
  render(<App />);
}

describe('embed mode', () => {
  it('hides the site header and navigation and shows a compact attribution', async () => {
    await open('/?embed=1&view=compare');
    expect(document.querySelector('.site-header')).toBeNull();
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(document.querySelector('.site-footer')).toBeNull();
    const footer = document.querySelector('.embed-footer')!;
    expect(footer.textContent).toContain('הלמ"ס');
    expect(footer.textContent).toContain('ל-5 ילדים');
    expect((await screen.findByText(/391\/2025/)).closest('footer')).toBe(footer);
  });

  it('links to the same view on the full site, without the embed parameters', async () => {
    await open('/disappearing-names/?embed=1&view=compare&names=a');
    const link = screen.getByRole('link', { name: 'לאתר המלא' }) as HTMLAnchorElement;
    const u = new URL(link.href);
    expect(u.searchParams.has('embed')).toBe(false);
    expect(u.searchParams.has('view')).toBe(false);
    expect(u.searchParams.get('names')).toBe('a');
    expect(link.target).toBe('_blank');
  });

  it('shows only the requested view', async () => {
    await open('/?embed=1&view=compare');
    expect(await screen.findByLabelText('חיפוש שם פרטי')).toBeTruthy();
    expect(screen.getByText(/הוסיפו עד 5 שמות/)).toBeTruthy();
  });

  it('keeps the normal chrome when not embedded', async () => {
    await open('/');
    expect(document.querySelector('.site-header')).not.toBeNull();
    expect(document.querySelector('.embed-footer')).toBeNull();
  });
});

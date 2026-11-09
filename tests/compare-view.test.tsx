// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IndexRow, Mover, Movers, NameEntry } from '../src/data/types';
import { fallen, meta, risen, series } from './fixtures';

const stable: NameEntry = {
  total: 2000,
  residual: 0,
  slices: { 'all/all': series(Array(20).fill(100)) },
};
const entries: Record<string, NameEntry> = Object.fromEntries(
  ['דנה', 'נועם', 'קרן', 'שרון', 'מאיה', 'עדן', 'תמר'].map((n, i) => [
    n,
    [fallen, risen, stable][i % 3],
  ]),
);
const index: IndexRow[] = Object.keys(entries).map((n, i) => [n, 1000 - i, 1]);

const mover = (name: string, peakYear: number, change: number): Mover => ({
  name,
  peakYear,
  peakCount: 100,
  baselineShare: 0.01,
  recentShare: 0.001,
  change,
  vanished: false,
  spark: [100, 0],
});
const movers = {
  'all/all': {
    risers: [mover('חדש', 2018, 9)],
    fallers: [mover('ישן60', 2002, -0.9), mover('ישן75', 2008, -0.95), mover('ישן90', 2014, -0.8)],
  },
  'jewish/all': { risers: [], fallers: [mover('יהודי', 2006, -0.99)] },
} as unknown as Movers;

vi.mock('../src/data/store', () => ({
  store: {
    index: async () => index,
    meta: async () => (await import('./fixtures')).meta,
    movers: async () => movers,
    series: async (n: string) => entries[n] ?? null,
  },
}));

const { Compare } = await import('../src/views/Compare');
const { navigate } = await import('../src/router');
const { names, fromYear, toYear, minPeak, mode } = await import('../src/state/compare');
const { sector, sex } = await import('../src/state/filters');

beforeAll(() => {
  ['#1f5fae', '#c2410c', '#15803d', '#7c3aed', '#a16207'].forEach((c, i) =>
    document.documentElement.style.setProperty(`--series-${i + 1}`, c),
  );
});
beforeEach(() => {
  names.value = [];
  fromYear.value = null;
  toYear.value = null;
  minPeak.value = 0;
  mode.value = 'count';
  sector.value = 'all';
  sex.value = 'all';
  navigate('compare');
});
afterEach(cleanup);

async function addByTyping(name: string) {
  const input = screen.getByLabelText('חיפוש שם פרטי') as HTMLInputElement;
  fireEvent.input(input, { target: { value: name } });
  fireEvent.submit(input.closest('form')!);
}
const picked = () =>
  within(screen.getByRole('list', { name: 'שמות בהשוואה' })).getAllByRole('listitem');
const tableRows = (caption: RegExp) =>
  within(screen.getByRole('table', { name: caption }))
    .queryAllByRole('rowheader')
    .map((r) => r.textContent);

describe('Compare view', () => {
  it('draws three names on one chart', async () => {
    render(<Compare />);
    await screen.findByLabelText('חיפוש שם פרטי');
    for (const n of ['דנה', 'נועם', 'קרן']) await addByTyping(n);
    await waitFor(() => expect(document.querySelectorAll('.chart-legend li')).toHaveLength(3));
    expect(picked()).toHaveLength(3);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('דנה');
  });

  it('refuses a sixth name and explains the limit', async () => {
    render(<Compare />);
    await screen.findByLabelText('חיפוש שם פרטי');
    for (const n of ['דנה', 'נועם', 'קרן', 'שרון', 'מאיה']) await addByTyping(n);
    await waitFor(() => expect(picked()).toHaveLength(5));
    await addByTyping('עדן');
    expect((await screen.findByRole('status')).textContent).toContain('עד 5 שמות');
    expect(names.value).toHaveLength(5);
    expect(names.value).not.toContain('עדן');
  });

  it('removes a name from the comparison', async () => {
    render(<Compare />);
    await screen.findByLabelText('חיפוש שם פרטי');
    await addByTyping('דנה');
    await addByTyping('נועם');
    await waitFor(() => expect(picked()).toHaveLength(2));
    fireEvent.click(screen.getByRole('button', { name: 'הסרה: דנה' }));
    await waitFor(() => expect(picked()).toHaveLength(1));
  });

  it('narrows both chart and tables to the chosen year range', async () => {
    render(<Compare />);
    await screen.findByRole('table', { name: /נעלמו/ });
    expect(tableRows(/נעלמו/)).toHaveLength(3);
    fireEvent.change(screen.getByLabelText('משנה'), { target: { value: '2005' } });
    fireEvent.change(screen.getByLabelText('עד שנה'), { target: { value: '2010' } });
    await waitFor(() => expect(tableRows(/נעלמו/)).toEqual(['ישן75']));
    expect(tableRows(/זינקו/)).toEqual([]); // the 2018 riser is outside the range
  });

  it('recomputes the tables for the selected sector', async () => {
    render(<Compare />);
    await screen.findByRole('table', { name: /נעלמו/ });
    fireEvent.click(screen.getByLabelText('יהודים'));
    await waitFor(() => expect(tableRows(/נעלמו/)).toEqual(['יהודי']));
  });

  it('sorts a table when its header is clicked', async () => {
    render(<Compare />);
    const table = await screen.findByRole('table', { name: /נעלמו/ });
    const header = within(table).getByRole('button', { name: /שנת שיא/ });
    fireEvent.click(header);
    await waitFor(() => expect(tableRows(/נעלמו/)).toEqual(['ישן90', 'ישן75', 'ישן60']));
    expect(header.closest('th')!.getAttribute('aria-sort')).toBe('descending');
    fireEvent.click(header);
    await waitFor(() => expect(tableRows(/נעלמו/)).toEqual(['ישן60', 'ישן75', 'ישן90']));
    expect(header.closest('th')!.getAttribute('aria-sort')).toBe('ascending');
  });

  it('adds a table row to the chart', async () => {
    index.push(['ישן75', 5, 1]);
    entries['ישן75'] = stable;
    render(<Compare />);
    const table = await screen.findByRole('table', { name: /נעלמו/ });
    fireEvent.click(within(table).getByRole('button', { name: 'הוספה: ישן75' }));
    await waitFor(() => expect(names.value).toEqual(['ישן75']));
    expect(
      within(table).getByRole('button', { name: 'הוספה: ישן75' }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('restores a comparison from the URL', async () => {
    navigate('compare', {
      names: 'דנה,נועם',
      sector: 'jewish',
      from: '2005',
      mode: 'share',
      min: '50',
    });
    render(<Compare />);
    await waitFor(() => expect(picked()).toHaveLength(2));
    expect((screen.getByLabelText('משנה') as HTMLSelectElement).value).toBe('2005');
    expect((screen.getByLabelText('יהודים') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('שיעור מכלל הלידות') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('מינימום לידות בשנת שיא') as HTMLInputElement).value).toBe('50');
  });
});

// keep the unused-import guard honest: meta is the mocked store's source
void meta;

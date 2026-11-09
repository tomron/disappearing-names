// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Chart, type ChartSeries } from '../src/components/Chart';

// jsdom loads no stylesheet, so provide the palette that app.css defines.
beforeAll(() => {
  ['#1f5fae', '#c2410c', '#15803d', '#7c3aed', '#a16207'].forEach((c, i) =>
    document.documentElement.style.setProperty(`--series-${i + 1}`, c),
  );
});
afterEach(cleanup);

const years = [2000, 2001, 2002, 2003];
const series = (
  name: string,
  values: number[],
  suppressed = values.map(() => false),
): ChartSeries => ({
  name,
  values,
  suppressed,
});

describe('Chart', () => {
  it('draws one line per series and exposes a text alternative', async () => {
    const { container } = render(
      <Chart
        years={years}
        series={[series('דנה', [10, 20, 30, 40]), series('נועם', [5, 6, 7, 8])]}
        summary="דנה עלתה, נועם יציב"
      />,
    );
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('דנה עלתה, נועם יציב');
    await waitFor(() => expect(container.querySelector('svg')).toBeTruthy());
    expect(container.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    // Plot renders each stroked line as a path; two series give two coloured lines
    const strokes = new Set(
      [...container.querySelectorAll('path[stroke]')].map((p) => p.getAttribute('stroke')),
    );
    expect(strokes.size).toBeGreaterThanOrEqual(2);
  });

  it('shows the legend only for multiple series', async () => {
    const one = render(<Chart years={years} series={[series('דנה', [1, 2, 3, 4])]} summary="x" />);
    expect(one.container.querySelector('.chart-legend')).toBeNull();
    one.unmount();
    const two = render(
      <Chart
        years={years}
        series={[series('דנה', [1, 2, 3, 4]), series('נועם', [4, 3, 2, 1])]}
        summary="x"
      />,
    );
    expect(two.container.querySelectorAll('.chart-legend li')).toHaveLength(2);
  });

  it('explains suppressed years only when there are some', async () => {
    const plain = render(
      <Chart years={years} series={[series('דנה', [1, 2, 3, 4])]} summary="x" />,
    );
    expect(plain.container.querySelector('figcaption')).toBeNull();
    plain.unmount();
    const withGap = render(
      <Chart
        years={years}
        series={[series('דנה', [10, 2.5, 2.5, 0], [false, true, true, false])]}
        summary="x"
      />,
    );
    expect(withGap.container.querySelector('figcaption')!.textContent).toMatch(/1–4/);
  });
});

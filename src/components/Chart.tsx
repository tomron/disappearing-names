import { useEffect, useRef, useState } from 'preact/hooks';
import { t } from '../strings';

export interface ChartSeries {
  name: string;
  /** One value per year (births or share). */
  values: number[];
  /** Years where CBS suppressed the value (1 to 4 births) rather than publishing a count. */
  suppressed: boolean[];
}

export interface ChartProps {
  years: number[];
  series: ChartSeries[];
  /** Text alternative describing the trend, for assistive technology. */
  summary: string;
  /** Formats a y value for the axis and the tooltip. */
  format?: (v: number) => string;
  /** Marks a year (for example the peak) with a vertical rule. */
  highlightYear?: number;
  height?: number;
}

const FALLBACK_WIDTH = 720;
const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Line chart of one or more name series. Plot is loaded on demand to keep first paint small. */
export function Chart({
  years,
  series,
  summary,
  format = String,
  highlightYear,
  height,
}: ChartProps) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [scheme, setScheme] = useState(0);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => setWidth(el.clientWidth));
    ro?.observe(el);
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onScheme = () => setScheme((n) => n + 1);
    mq?.addEventListener?.('change', onScheme);
    return () => {
      ro?.disconnect();
      mq?.removeEventListener?.('change', onScheme);
    };
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    import('@observablehq/plot').then((Plot) => {
      if (cancelled) return;
      const w = width || FALLBACK_WIDTH;
      const palette = [1, 2, 3, 4, 5].map((i) => cssVar(`--series-${i}`) || '#1f5fae');
      const rows = series.flatMap((s) =>
        years.map((year, i) => ({
          name: s.name,
          year,
          value: s.values[i],
          suppressed: s.suppressed[i],
        })),
      );
      const suppressedRows = rows.filter((r) => r.suppressed);
      const chart = Plot.plot({
        width: w,
        height: height ?? (w < 480 ? 240 : 320),
        marginLeft: 52,
        style: { background: 'transparent', color: 'var(--text)', fontSize: '12px' },
        x: { label: null, tickFormat: String },
        y: { label: null, grid: true, tickFormat: format },
        color: { domain: series.map((s) => s.name), range: palette },
        marks: [
          Plot.ruleY([0]),
          highlightYear === undefined
            ? null
            : Plot.ruleX([highlightYear], { strokeDasharray: '4 3', opacity: 0.5 }),
          Plot.line(rows, { x: 'year', y: 'value', stroke: 'name', strokeWidth: 2 }),
          Plot.dot(suppressedRows, {
            x: 'year',
            y: 'value',
            stroke: 'name',
            symbol: 'times',
            r: 3,
          }),
          Plot.tip(
            rows,
            Plot.pointerX({
              x: 'year',
              y: 'value',
              stroke: 'name',
              title: (d: (typeof rows)[number]) =>
                `${d.name}\n${d.year}: ${d.suppressed ? t.chart.suppressed : format(d.value)}`,
            }),
          ),
        ],
      });
      chart.setAttribute('aria-hidden', 'true');
      el.replaceChildren(chart);
    });
    return () => {
      cancelled = true;
    };
  }, [years, series, width, scheme, format, highlightYear, height]);

  const hasSuppressed = series.some((s) => s.suppressed.some(Boolean));
  return (
    <figure class="chart">
      <div class="chart-img" role="img" aria-label={summary}>
        {series.length > 1 && (
          <ul class="chart-legend" aria-hidden="true">
            {series.map((s, i) => (
              <li key={s.name} style={{ '--swatch': `var(--series-${(i % 5) + 1})` }}>
                {s.name}
              </li>
            ))}
          </ul>
        )}
        <div class="chart-host" ref={host} />
      </div>
      {hasSuppressed && <figcaption aria-hidden="true">{t.chart.suppressedKey}</figcaption>}
    </figure>
  );
}

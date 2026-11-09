import { useEffect, useMemo, useState } from 'preact/hooks';
import { Chart, type ChartSeries } from '../components/Chart';
import { FilterBar } from '../components/FilterBar';
import { MoversTable } from '../components/MoversTable';
import { NameSearch } from '../components/NameSearch';
import { store } from '../data/store';
import type { IndexRow, Meta, Movers, NameEntry } from '../data/types';
import { addName, filterMovers, restrictYears } from '../lib/compare';
import { formatNumber, formatShare, sectorLabel, sexLabel } from '../lib/labels';
import { createSearch } from '../lib/search';
import { buildSeries } from '../lib/series';
import { summarize } from '../lib/summary';
import {
  fromYear,
  MAX_NAMES,
  minPeak,
  mode,
  names,
  toYear,
  useCompareUrlSync,
} from '../state/compare';
import { sector, sex, slice } from '../state/filters';
import { t } from '../strings';

interface Loaded {
  index: IndexRow[];
  meta: Meta;
  movers: Movers;
}

const emptyEntries: Record<string, NameEntry | null> = {};

export function Compare() {
  useCompareUrlSync();
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [entries, setEntries] = useState(emptyEntries);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([store.index(), store.meta(), store.movers()]).then(
      ([index, meta, movers]) => setData({ index, meta, movers }),
      () => setFailed(true),
    );
  }, []);

  // Load the series of every name on the chart that has not been loaded yet.
  useEffect(() => {
    const missing = names.value.filter((n) => !(n in entries));
    if (!missing.length) return;
    let cancelled = false;
    Promise.all(missing.map(async (n) => [n, await store.series(n)] as const)).then(
      (loaded) => !cancelled && setEntries((prev) => ({ ...prev, ...Object.fromEntries(loaded) })),
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [names.value.join(','), entries]);

  const search = useMemo(() => (data ? createSearch(data.index) : null), [data]);

  function add(name: string) {
    const row = search?.find(name);
    if (!row) return setMessage(t.compare.unknown(name));
    const result = addName(names.value, row[0], MAX_NAMES);
    if (result.rejected === 'limit') return setMessage(t.compare.limit(MAX_NAMES));
    if (result.rejected === 'duplicate') return setMessage(t.compare.duplicate);
    setMessage('');
    names.value = result.names;
  }

  const meta = data?.meta;
  const plotted = useMemo(() => {
    if (!meta)
      return {
        chart: [] as ChartSeries[],
        missing: [] as string[],
        summary: '',
        years: [] as number[],
      };
    const chart: ChartSeries[] = [];
    const missing: string[] = [];
    const summaries: string[] = [];
    for (const n of names.value) {
      const entry = entries[n];
      if (entry === undefined) continue; // still loading
      const built =
        entry &&
        buildSeries(n, entry, meta, {
          mode: mode.value,
          sector: sector.value,
          sex: sex.value,
          split: false,
        });
      if (!built || built.chart.length === 0) {
        missing.push(n);
        continue;
      }
      chart.push(built.chart[0]);
      summaries.push(
        summarize(n, entry.slices[built.slices[0]]!, {
          sector: sector.value,
          sex: sex.value,
          meta,
        }),
      );
    }
    const years = Array.from(
      { length: meta.lastYear - meta.firstYear + 1 },
      (_, i) => meta.firstYear + i,
    );
    return { chart, missing, summary: summaries.join(' '), years };
  }, [meta, entries, names.value.join(','), mode.value, sector.value, sex.value]);

  if (failed) return <p role="alert">{t.loadError}</p>;
  if (!data || !meta) return <p>{t.loading}</p>;

  const rangeInvalid =
    fromYear.value !== null && toYear.value !== null && fromYear.value > toYear.value;
  const view = restrictYears(plotted.years, plotted.chart, fromYear.value, toYear.value);
  const years = Array.from(
    { length: meta.lastYear - meta.firstYear + 1 },
    (_, i) => meta.firstYear + i,
  );
  const entry = data.movers[slice.value];
  const filter = { from: fromYear.value, to: toYear.value, minPeak: minPeak.value };
  const plottedNames = names.value.filter((n) => !plotted.missing.includes(n) && entries[n]);

  return (
    <div class="compare">
      <p class="note">{t.compare.intro}</p>
      <NameSearch index={data.index} selected="" onSelect={add} />
      {message && (
        <p class="note" role="status">
          {message}
        </p>
      )}
      {names.value.length > 0 && (
        <ul class="picked" aria-label={t.compare.chosen}>
          {names.value.map((n) => {
            const i = plottedNames.indexOf(n);
            return (
              <li
                key={n}
                style={{ '--swatch': i >= 0 ? `var(--series-${(i % 5) + 1})` : 'var(--border)' }}
              >
                {n}
                <button
                  type="button"
                  aria-label={`${t.compare.remove}: ${n}`}
                  onClick={() => (names.value = names.value.filter((x) => x !== n))}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <FilterBar />
      <div class="range">
        <fieldset class="filter-group">
          <legend>{t.explore.modeLabel}</legend>
          {(['count', 'share'] as const).map((m) => (
            <label key={m} class="chip">
              <input
                type="radio"
                name="mode"
                checked={mode.value === m}
                onChange={() => (mode.value = m)}
              />
              <span>{t.explore[m]}</span>
            </label>
          ))}
        </fieldset>
        <label>
          {t.compare.from}
          <select
            value={fromYear.value ?? ''}
            onChange={(e) =>
              (fromYear.value = e.currentTarget.value ? Number(e.currentTarget.value) : null)
            }
          >
            <option value="">{meta.firstYear}</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.compare.to}
          <select
            value={toYear.value ?? ''}
            onChange={(e) =>
              (toYear.value = e.currentTarget.value ? Number(e.currentTarget.value) : null)
            }
          >
            <option value="">{meta.lastYear}</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.compare.minPeak}
          <input
            type="number"
            min="0"
            step="10"
            value={minPeak.value}
            onInput={(e) => (minPeak.value = Math.max(0, Number(e.currentTarget.value) || 0))}
          />
        </label>
      </div>

      {plotted.missing.map((n) => (
        <p key={n} class="note">
          {t.compare.missing(n, `${sexLabel[sex.value]}, ${sectorLabel[sector.value]}`)}
        </p>
      ))}
      {rangeInvalid && (
        <p class="note" role="status">
          {t.compare.rangeInvalid}
        </p>
      )}
      {view.series.length > 0 && !rangeInvalid && (
        <>
          <p class="axis-title">
            {mode.value === 'share' ? t.explore.yAxisShare : t.explore.yAxisCount}
          </p>
          <Chart
            years={view.years}
            series={view.series}
            summary={plotted.summary}
            format={mode.value === 'share' ? formatShare : formatNumber}
          />
        </>
      )}

      <div class="tables">
        <MoversTable
          caption={t.compare.risers}
          rows={filterMovers(entry?.risers ?? [], filter)}
          selected={names.value}
          onAdd={add}
          initialSort={{ key: 'change', dir: 'desc' }}
        />
        <MoversTable
          caption={t.compare.fallers}
          rows={filterMovers(entry?.fallers ?? [], filter)}
          selected={names.value}
          onAdd={add}
          initialSort={{ key: 'change', dir: 'asc' }}
        />
      </div>
    </div>
  );
}

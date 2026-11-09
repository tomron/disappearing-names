import { useEffect, useMemo, useState } from 'preact/hooks';
import { Chart } from '../components/Chart';
import { FilterBar } from '../components/FilterBar';
import { NameSearch } from '../components/NameSearch';
import { store } from '../data/store';
import type { IndexRow, Meta, NameEntry } from '../data/types';
import { formatNumber, formatShare, sectorLabel } from '../lib/labels';
import { describeMover, pickMover, type Pick } from '../lib/random';
import { createSearch } from '../lib/search';
import { buildSeries, type Mode } from '../lib/series';
import { summarize, trajectory } from '../lib/summary';
import { mode, name, split, useExploreUrlSync } from '../state/explore';
import { sector, sex, slice } from '../state/filters';
import { t } from '../strings';

interface Loaded {
  index: IndexRow[];
  meta: Meta;
}

function Result({ name, entry, meta }: { name: string; entry: NameEntry; meta: Meta }) {
  const m: Mode = mode.value;
  const built = useMemo(
    () =>
      buildSeries(name, entry, meta, {
        mode: m,
        sector: sector.value,
        sex: sex.value,
        split: split.value,
      }),
    [name, entry, meta, m, sector.value, sex.value, split.value],
  );
  if (built.chart.length === 0) return <p class="note">{t.explore.noData}</p>;

  const isAll = sector.value === 'all' && sex.value === 'all';
  const summary = built.slices
    .map((key) => {
      const [sec] = key.split('/');
      return summarize(name, entry.slices[key]!, {
        sector: sec as typeof sector.value,
        sex: sex.value,
        meta,
        residual: isAll && !split.value ? entry.residual : undefined,
      });
    })
    .join(' ');

  const first = entry.slices[built.slices[0]]!;
  const peakYear = split.value ? undefined : trajectory(first, meta)?.peakYear;
  return (
    <section class="result" aria-labelledby="result-name">
      <h2 id="result-name">{name}</h2>
      <p class="summary">{summary}</p>
      <p class="axis-title">{m === 'share' ? t.explore.yAxisShare : t.explore.yAxisCount}</p>
      <Chart
        years={Array.from(
          { length: meta.lastYear - meta.firstYear + 1 },
          (_, i) => meta.firstYear + i,
        )}
        series={built.chart}
        summary={summary}
        format={m === 'share' ? formatShare : formatNumber}
        highlightYear={peakYear}
      />
      {peakYear !== undefined && (
        <p class="note">
          {t.explore.peakNote}: {peakYear}
        </p>
      )}
    </section>
  );
}

export function Explore() {
  useExploreUrlSync();
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [entry, setEntry] = useState<NameEntry | null | undefined>(undefined);
  const [picked, setPicked] = useState<Pick | null>(null);
  const [noMovers, setNoMovers] = useState(false);

  useEffect(() => {
    Promise.all([store.index(), store.meta()]).then(
      ([index, meta]) => setData({ index, meta }),
      () => setFailed(true),
    );
  }, []);

  const search = useMemo(() => (data ? createSearch(data.index) : null), [data]);
  const row = search && name.value ? search.find(name.value) : undefined;
  const resolved = row?.[0];

  useEffect(() => {
    setEntry(undefined);
    if (!resolved || !row?.[2]) return;
    let cancelled = false;
    store.series(resolved).then(
      (e) => !cancelled && setEntry(e),
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [resolved]);

  async function surprise() {
    setNoMovers(false);
    const pick = pickMover(await store.movers(), slice.value);
    if (!pick) {
      setPicked(null);
      setNoMovers(true);
      return;
    }
    setPicked(pick);
    name.value = pick.name;
  }

  if (failed) return <p role="alert">{t.loadError}</p>;
  if (!data) return <p>{t.loading}</p>;

  return (
    <div class="explore">
      <div class="toolbar">
        <NameSearch
          index={data.index}
          selected={name.value}
          onSelect={(n) => {
            setPicked(null);
            name.value = n;
          }}
        />
        <button type="button" class="secondary" onClick={surprise}>
          🎲 {t.explore.surprise}
        </button>
      </div>
      {picked && picked.name === name.value && (
        <p class="pick" aria-live="polite">
          <strong>{picked.name}</strong>: {describeMover(picked, data.meta.lastYear)} (
          {sectorLabel[sector.value]})
        </p>
      )}
      {noMovers && (
        <p class="note" role="status">
          {t.explore.surpriseNone}
        </p>
      )}
      <FilterBar />
      <div class="display-options">
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
        <label class="check">
          <input
            type="checkbox"
            checked={split.value}
            onChange={(e) => (split.value = e.currentTarget.checked)}
          />
          {t.explore.split}
        </label>
      </div>

      {!name.value && <p class="note">{t.explore.intro}</p>}
      {name.value && !row && (
        <p class="note" role="status">
          {t.explore.notFound(name.value)}
        </p>
      )}
      {row && !row[2] && (
        <p class="note" role="status">
          {t.explore.noSeries(row[0], row[1])}
        </p>
      )}
      {row && row[2] === 1 && entry === undefined && <p>{t.loading}</p>}
      {row && entry && <Result name={row[0]} entry={entry} meta={data.meta} />}
    </div>
  );
}

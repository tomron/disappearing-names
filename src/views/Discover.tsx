import { useEffect, useMemo, useState } from 'preact/hooks';
import { FilterBar } from '../components/FilterBar';
import { NameCard } from '../components/NameCard';
import { store } from '../data/store';
import type { Mover, Movers } from '../data/types';
import { decadeLabel, decadeOf, sectionOf, selectCards, type Section } from '../lib/cards';
import { slice } from '../state/filters';
import { t } from '../strings';

const SECTIONS: Section[] = ['vanished', 'fell', 'surged'];
const SELECTION = { count: 12, pool: 48 };

export function Discover() {
  const [data, setData] = useState<{ movers: Movers; lastYear: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [decade, setDecade] = useState<number | null>(null);
  const [round, setRound] = useState(0); // 0 is the most extreme names; each reshuffle increments

  useEffect(() => {
    Promise.all([store.movers(), store.meta()]).then(
      ([movers, meta]) => setData({ movers, lastYear: meta.lastYear }),
      () => setFailed(true),
    );
  }, []);

  const entry = data?.movers[slice.value];
  const all: Mover[] = useMemo(() => (entry ? [...entry.risers, ...entry.fallers] : []), [entry]);
  const decades = useMemo(
    () => [...new Set(all.map((m) => decadeOf(m.peakYear)))].sort((a, b) => a - b),
    [all],
  );
  const activeDecade = decade !== null && decades.includes(decade) ? decade : null;

  const shown = useMemo(() => {
    const pool = all.filter((m) => activeDecade === null || decadeOf(m.peakYear) === activeDecade);
    const rng = round > 0 ? Math.random : undefined;
    return Object.fromEntries(
      SECTIONS.map((s) => [
        s,
        selectCards(
          pool.filter((m) => sectionOf(m) === s),
          SELECTION,
          rng,
        ),
      ]),
    ) as Record<Section, Mover[]>;
  }, [all, activeDecade, round]);

  if (failed) return <p role="alert">{t.loadError}</p>;
  if (!data) return <p>{t.loading}</p>;

  return (
    <div class="discover">
      <p class="note">{t.discover.intro}</p>
      <FilterBar />
      <div class="display-options">
        <fieldset class="filter-group">
          <legend>{t.discover.decade}</legend>
          {[null, ...decades].map((d) => (
            <label key={d ?? 'all'} class="chip">
              <input
                type="radio"
                name="decade"
                checked={activeDecade === d}
                onChange={() => setDecade(d)}
              />
              <span>{d === null ? t.discover.allDecades : decadeLabel(d)}</span>
            </label>
          ))}
        </fieldset>
        <button type="button" class="secondary" onClick={() => setRound((r) => r + 1)}>
          {t.discover.reshuffle}
        </button>
      </div>

      {SECTIONS.map((s) => (
        <section key={s} aria-labelledby={`section-${s}`}>
          <h2 id={`section-${s}`}>{t.discover.sections[s]}</h2>
          {shown[s].length === 0 ? (
            <p class="note">{t.discover.empty}</p>
          ) : (
            <ul class="cards">
              {shown[s].map((m) => (
                <NameCard key={m.name} mover={m} lastYear={data.lastYear} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

import type { SectorKey, SexKey } from '../data/types';
import { sectorLabel, sexLabel } from '../lib/labels';
import { SECTORS, SEXES, sector, sex } from '../state/filters';
import { t } from '../strings';

interface GroupProps<K extends string> {
  legend: string;
  name: string;
  options: K[];
  labels: Record<K, string>;
  value: K;
  onChange: (v: K) => void;
}

function Group<K extends string>({
  legend,
  name,
  options,
  labels,
  value,
  onChange,
}: GroupProps<K>) {
  return (
    <fieldset class="filter-group">
      <legend>{legend}</legend>
      {options.map((o) => (
        <label key={o} class="chip">
          <input
            type="radio"
            name={name}
            value={o}
            checked={value === o}
            onChange={() => onChange(o)}
          />
          <span>{labels[o]}</span>
        </label>
      ))}
    </fieldset>
  );
}

/** Sector and sex filters, shared by all views through the signals in state/filters. */
export function FilterBar() {
  return (
    <div class="filters">
      <Group<SectorKey>
        legend={t.filters.sector}
        name="sector"
        options={SECTORS}
        labels={sectorLabel}
        value={sector.value}
        onChange={(v) => (sector.value = v)}
      />
      <Group<SexKey>
        legend={t.filters.sex}
        name="sex"
        options={SEXES}
        labels={sexLabel}
        value={sex.value}
        onChange={(v) => (sex.value = v)}
      />
    </div>
  );
}

import { useMemo, useState } from 'preact/hooks';
import type { Mover } from '../data/types';
import { sortMovers, type SortDir, type SortKey } from '../lib/compare';
import { formatPercent, formatShare } from '../lib/labels';
import { t } from '../strings';

interface Props {
  caption: string;
  rows: Mover[];
  /** Names already on the chart. */
  selected: string[];
  onAdd: (name: string) => void;
  initialSort: { key: SortKey; dir: SortDir };
  limit?: number;
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: t.compare.table.name },
  { key: 'peakYear', label: t.compare.table.peakYear },
  { key: 'baselineShare', label: t.compare.table.baseline },
  { key: 'recentShare', label: t.compare.table.recent },
  { key: 'change', label: t.compare.table.change },
];

export function MoversTable({ caption, rows, selected, onAdd, initialSort, limit = 25 }: Props) {
  const [sort, setSort] = useState(initialSort);
  const sorted = useMemo(() => sortMovers(rows, sort.key, sort.dir), [rows, sort]);
  const shown = sorted.slice(0, limit);

  return (
    <div class="table-wrap">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                scope="col"
                aria-sort={
                  sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'
                }
              >
                <button
                  type="button"
                  class="sort"
                  onClick={() =>
                    setSort((s) => ({
                      key: c.key,
                      dir:
                        s.key === c.key
                          ? s.dir === 'asc'
                            ? 'desc'
                            : 'asc'
                          : c.key === 'name'
                            ? 'asc'
                            : 'desc',
                    }))
                  }
                >
                  {c.label}
                  {sort.key === c.key && (
                    <span aria-hidden="true">{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span>
                  )}
                </button>
              </th>
            ))}
            <th scope="col">
              <span class="visually-hidden">{t.compare.table.action}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length + 1}>{t.compare.table.empty}</td>
            </tr>
          )}
          {shown.map((m) => (
            <tr key={m.name}>
              <th scope="row">{m.name}</th>
              <td>{m.peakYear}</td>
              <td>{formatShare(m.baselineShare)}</td>
              <td>{formatShare(m.recentShare)}</td>
              <td>{formatPercent(m.change)}</td>
              <td>
                <button
                  type="button"
                  class="secondary small"
                  disabled={selected.includes(m.name)}
                  aria-label={`${t.compare.table.add}: ${m.name}`}
                  onClick={() => onAdd(m.name)}
                >
                  {selected.includes(m.name) ? '✓' : t.compare.table.add}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import type { NameRow, ParsedWorkbook, Sector, Sex } from './parse-cbs';

export type SectorKey = Sector | 'all';
export type SexKey = Sex | 'all';
export type SliceKey = `${SectorKey}/${SexKey}`;

/** Estimated births for a suppressed cell (CBS publishes `..` for 1 to 4): the midpoint. */
export const SUPPRESSED_ESTIMATE = 2.5;

/**
 * A name's yearly series within one slice. `n` is the sum of published counts and `s` is the
 * number of suppressed cells (each 1 to 4 births); a suppressed cell is never folded into `n`.
 * A year with n = 0 and s = 0 is a true zero.
 */
export interface NameSeries {
  name: string;
  total: number;
  /** Births in `total` that the yearly cells cannot account for (see `residual`). */
  residual: number;
  n: number[];
  s: number[];
}

export interface Slice {
  names: Map<string, NameSeries>;
  /** Estimated births per year: published counts plus SUPPRESSED_ESTIMATE per suppressed cell. */
  births: number[];
}

export interface Aggregated {
  years: number[];
  slices: Map<SliceKey, Slice>;
}

const SECTORS: SectorKey[] = ['jewish', 'muslim', 'christian', 'druze', 'all'];
const SEXES: SexKey[] = ['F', 'M', 'all'];

export const SLICE_KEYS: SliceKey[] = SECTORS.flatMap((sector) =>
  SEXES.map((sex): SliceKey => `${sector}/${sex}`),
);

export function aggregate({ years, rows }: ParsedWorkbook): Aggregated {
  const slices = new Map<SliceKey, Slice>(
    SLICE_KEYS.map((k) => [k, { names: new Map(), births: new Array(years.length).fill(0) }]),
  );

  for (const row of rows) {
    const keys = new Set<SliceKey>([
      `${row.sector}/${row.sex}`,
      `${row.sector}/all`,
      `all/${row.sex}`,
      'all/all',
    ]);
    for (const key of keys) {
      const slice = slices.get(key)!;
      let series = slice.names.get(row.name);
      if (!series) {
        series = {
          name: row.name,
          total: 0,
          residual: 0,
          n: new Array(years.length).fill(0),
          s: new Array(years.length).fill(0),
        };
        slice.names.set(row.name, series);
      }
      series.total += row.total;
      series.residual += Math.max(0, residual(row));
      row.cells.forEach((cell, i) => {
        if (cell === 'S') {
          series.s[i] += 1;
          slice.births[i] += SUPPRESSED_ESTIMATE;
        } else {
          series.n[i] += cell;
          slice.births[i] += cell;
        }
      });
    }
  }
  return { years, slices };
}

export interface Reconciliation {
  rows: number;
  /** Rows whose total is below what their own yearly cells require: a data error. */
  belowLowerBound: NameRow[];
  /** Rows whose total exceeds even the 4-per-suppressed-cell maximum of their yearly cells. */
  withResidual: NameRow[];
}

/** Births in column B that the 1949-2024 cells cannot account for (at most 4 per suppressed cell). */
export function residual(row: NameRow): number {
  let published = 0;
  let suppressed = 0;
  for (const c of row.cells) {
    if (c === 'S') suppressed++;
    else published += c;
  }
  return row.total - (published + 4 * suppressed);
}

/**
 * Checks each row's all-years total (column B) against its yearly cells. A total below
 * published + 1 per suppressed cell is impossible. A total above published + 4 per suppressed
 * cell leaves a residual, which the real file shows for about 2% of rows: likely births before
 * 1949 or otherwise outside the yearly columns (unconfirmed), so it is reported, not rejected.
 */
export function reconcileTotals(rows: NameRow[]): Reconciliation {
  const belowLowerBound: NameRow[] = [];
  const withResidual: NameRow[] = [];
  for (const row of rows) {
    let published = 0;
    let suppressed = 0;
    for (const c of row.cells) {
      if (c === 'S') suppressed++;
      else published += c;
    }
    if (row.total < published + suppressed) belowLowerBound.push(row);
    else if (residual(row) > 0) withResidual.push(row);
  }
  return { rows: rows.length, belowLowerBound, withResidual };
}

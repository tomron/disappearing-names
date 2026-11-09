import { beforeAll, describe, expect, it } from 'vitest';
import { parseCbsWorkbook, SHEET_LAYOUT, type ParsedWorkbook } from '../scripts/lib/parse-cbs';

const FILE = 'data/raw/11_25_391t1.xlsx';
let wb: ParsedWorkbook;

beforeAll(async () => {
  wb = await parseCbsWorkbook(FILE);
}, 60_000);

describe('real CBS workbook layout', () => {
  it('covers years 1949-2024', () => {
    expect(wb.years[0]).toBe(1949);
    expect(wb.years.at(-1)).toBe(2024);
    expect(wb.years).toHaveLength(76);
  });

  it('has all eight sector/sex combinations', () => {
    const combos = new Set(wb.rows.map((r) => `${r.sector}/${r.sex}`));
    expect(combos.size).toBe(Object.keys(SHEET_LAYOUT).length);
  });

  // These scan every cell, so they collect offenders and assert once: millions of expect() calls
  // were too slow on CI runners.
  it('every row has one cell per year and a total of at least 5', () => {
    const bad = wb.rows.filter((r) => r.cells.length !== wb.years.length || r.total < 5);
    expect(bad.map((r) => `${r.sector}/${r.sex} ${r.name}`)).toEqual([]);
  });

  it('published counts are 0 or at least 5, and never exceed the total', () => {
    const bad: string[] = [];
    for (const r of wb.rows) {
      let sum = 0;
      let invalid = false;
      for (const c of r.cells) {
        if (c === 'S') continue;
        if (c !== 0 && c < 5) invalid = true;
        sum += c;
      }
      if (invalid || sum > r.total) bad.push(`${r.sector}/${r.sex} ${r.name}`);
    }
    expect(bad).toEqual([]);
  });

  it('contains suppressed cells and explicit zeros', () => {
    const flat = wb.rows.flatMap((r) => r.cells);
    expect(flat).toContain('S');
    expect(flat).toContain(0);
  });
});

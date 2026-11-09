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

  it('every row has one cell per year and a total of at least 5', () => {
    for (const r of wb.rows) {
      expect(r.cells).toHaveLength(wb.years.length);
      expect(r.total).toBeGreaterThanOrEqual(5);
    }
  });

  it('published counts are 0 or at least 5, and never exceed the total', () => {
    for (const r of wb.rows) {
      let sum = 0;
      for (const c of r.cells) {
        if (c === 'S') continue;
        expect(c === 0 || c >= 5).toBe(true);
        sum += c;
      }
      expect(sum).toBeLessThanOrEqual(r.total);
    }
  });

  it('contains suppressed cells and explicit zeros', () => {
    const flat = wb.rows.flatMap((r) => r.cells);
    expect(flat).toContain('S');
    expect(flat).toContain(0);
  });
});

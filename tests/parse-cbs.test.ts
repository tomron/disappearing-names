import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { CbsFormatError, parseCbsWorkbook, SHEET_LAYOUT } from '../scripts/lib/parse-cbs';

type Opts = {
  header?: (string | number)[];
  rows?: Record<string, (string | number)[][]>; // sheet title -> data rows
  skipSheet?: string;
};

const YEARS = [2000, 2001, 2002];

async function makeWorkbook(opts: Opts = {}): Promise<string> {
  const wb = new ExcelJS.Workbook();
  for (const title of Object.keys(SHEET_LAYOUT)) {
    if (title === opts.skipSheet) continue;
    const ws = wb.addWorksheet(title);
    ws.addRow(['כותרת']);
    ws.addRow([title]);
    ws.addRow(opts.header ?? ['prati1', 'סך הכל', ...YEARS]);
    for (const r of opts.rows?.[title] ?? []) ws.addRow(r);
  }
  const file = join(mkdtempSync(join(tmpdir(), 'cbs-')), 'fixture.xlsx');
  await wb.xlsx.writeFile(file);
  return file;
}

const GIRLS = 'בנות יהודיות';

describe('parseCbsWorkbook', () => {
  it('tags sector and sex from the sheet and keeps 0 and .. distinct', async () => {
    const file = await makeWorkbook({ rows: { [GIRLS]: [['מאיה', 30, 10, '..', 0]] } });
    const { years, rows } = await parseCbsWorkbook(file);
    expect(years).toEqual(YEARS);
    expect(rows).toEqual([
      { sector: 'jewish', sex: 'F', name: 'מאיה', total: 30, cells: [10, 'S', 0] },
    ]);
  });

  it('keeps total-only names (no yearly cell of 5 or more)', async () => {
    const file = await makeWorkbook({ rows: { [GIRLS]: [['נדירה', 6, '..', '..', 0]] } });
    const { rows } = await parseCbsWorkbook(file);
    expect(rows[0].total).toBe(6);
    expect(rows[0].cells).toEqual(['S', 'S', 0]);
  });

  it('accepts numbers stored as text with a thousands separator', async () => {
    const file = await makeWorkbook({ rows: { [GIRLS]: [['דנה', '1,395', '1,200', 195, 0]] } });
    const { rows } = await parseCbsWorkbook(file);
    expect(rows[0].total).toBe(1395);
    expect(rows[0].cells[0]).toBe(1200);
  });

  it('reports a missing raw file with download guidance', async () => {
    await expect(parseCbsWorkbook('data/raw/nope.xlsx')).rejects.toThrow(/data\/raw\/README\.md/);
  });

  it('fails on a non-numeric count', async () => {
    const file = await makeWorkbook({ rows: { [GIRLS]: [['מאיה', 30, 'abc', 0, 0]] } });
    await expect(parseCbsWorkbook(file)).rejects.toThrow(/unexpected cell value "abc"/);
  });

  it('fails when the total column header is not where expected', async () => {
    const file = await makeWorkbook({ header: ['prati1', 'שם אחר', ...YEARS] });
    await expect(parseCbsWorkbook(file)).rejects.toThrow(/column B header/);
  });

  it('fails on a non-numeric year header', async () => {
    const file = await makeWorkbook({ header: ['prati1', 'סך הכל', 'x', 2001] });
    await expect(parseCbsWorkbook(file)).rejects.toThrow(/non-numeric year header/);
  });

  it('fails when a sheet is missing', async () => {
    const file = await makeWorkbook({ skipSheet: 'בנים דרוזים' });
    await expect(parseCbsWorkbook(file)).rejects.toThrow(CbsFormatError);
    await expect(parseCbsWorkbook(file)).rejects.toThrow(/Missing sheets: בנים דרוזים/);
  });
});

import { existsSync, readFileSync } from 'node:fs';
import { strFromU8, unzipSync } from 'fflate';

export type Sector = 'jewish' | 'muslim' | 'christian' | 'druze';
export type Sex = 'F' | 'M';

/** Per-year cell: a published count (>= 5), 0, or suppressed (CBS `..`, 1-4 births). */
export type Cell = number | 'S';

export interface NameRow {
  sector: Sector;
  sex: Sex;
  name: string;
  total: number;
  cells: Cell[]; // aligned with ParsedWorkbook.years
}

export interface ParsedWorkbook {
  years: number[];
  rows: NameRow[];
}

export const SHEET_LAYOUT: Record<string, { sector: Sector; sex: Sex }> = {
  'בנות יהודיות': { sector: 'jewish', sex: 'F' },
  'בנים יהודים': { sector: 'jewish', sex: 'M' },
  'בנות מוסלמיות': { sector: 'muslim', sex: 'F' },
  'בנים מוסלמים': { sector: 'muslim', sex: 'M' },
  'בנות נוצריות-ערביות': { sector: 'christian', sex: 'F' },
  'בנים נוצרים-ערבים': { sector: 'christian', sex: 'M' },
  'בנות דרוזיות': { sector: 'druze', sex: 'F' },
  'בנים דרוזים': { sector: 'druze', sex: 'M' },
};

export const HEADER_ROW = 3;
const SUPPRESSED = '..';
// CBS sometimes stores numbers as text with thousands separators, e.g. "1,395".
const NUMBER = /^\d{1,3}(,\d{3})+$|^\d+$/;
const toNumber = (s: string) => Number(s.replace(/,/g, ''));

export class CbsFormatError extends Error {}

export function parseCell(raw: string, where: string): Cell {
  if (raw === SUPPRESSED) return 'S';
  if (NUMBER.test(raw)) return toNumber(raw);
  throw new CbsFormatError(`${where}: unexpected cell value ${JSON.stringify(raw)}`);
}

const XML_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function unescapeXml(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return String.fromCodePoint(code);
    }
    return XML_ENTITIES[e] ?? m;
  });
}

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w:]+)="([^"]*)"/g)) out[m[1]] = unescapeXml(m[2]);
  return out;
}

function textOf(xml: string): string {
  let out = '';
  for (const m of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) out += m[1];
  return unescapeXml(out);
}

function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));
}

function columnIndex(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Yields [rowNumber, cell texts by column index] for each row of a worksheet. */
function* sheetRows(xml: string, shared: string[]): Generator<[number, string[]]> {
  for (const rm of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const number = Number(attrs(rm[1]).r);
    const cells: string[] = [];
    for (const cm of (rm[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const a = attrs(cm[1]);
      const body = cm[2] ?? '';
      let text = '';
      if (a.t === 'inlineStr') text = textOf(body);
      else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
        if (v !== undefined) text = a.t === 's' ? (shared[Number(v)] ?? '') : unescapeXml(v);
      }
      cells[columnIndex(a.r)] = text.trim();
    }
    yield [number, cells];
  }
}

export async function parseCbsWorkbook(path: string): Promise<ParsedWorkbook> {
  if (!existsSync(path)) {
    throw new CbsFormatError(
      `CBS file not found at ${path}. Download the given-names xlsx from cbs.gov.il in a browser ` +
        `and place it in data/raw/ (see data/raw/README.md).`,
    );
  }
  const files = unzipSync(readFileSync(path), {
    filter: (f) =>
      /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(
        f.name,
      ),
  });
  const read = (name: string) => {
    const f = files[name];
    if (!f) throw new CbsFormatError(`Not a CBS names workbook: ${name} is missing`);
    return strFromU8(f);
  };

  const targets = new Map<string, string>();
  for (const m of read('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)) {
    const a = attrs(m[0]);
    targets.set(a.Id, a.Target.replace(/^\/?(xl\/)?/, 'xl/'));
  }
  const shared =
    'xl/sharedStrings.xml' in files ? parseSharedStrings(read('xl/sharedStrings.xml')) : [];

  const rows: NameRow[] = [];
  let years: number[] | null = null;
  const seen = new Set<string>();

  for (const m of read('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)) {
    const a = attrs(m[0]);
    const title = a.name;
    const layout = SHEET_LAYOUT[title];
    if (!layout) throw new CbsFormatError(`Unexpected sheet ${JSON.stringify(title)}`);
    seen.add(title);
    const target = targets.get(a['r:id']);
    if (!target) throw new CbsFormatError(`${title}: worksheet relationship not found`);
    let sheetYears: number[] | null = null;

    for (const [number, values] of sheetRows(read(target), shared)) {
      if (number < HEADER_ROW) continue;
      if (number === HEADER_ROW) {
        if (values[1] !== 'סך הכל') {
          throw new CbsFormatError(`${title}: column B header is not "סך הכל" (got ${values[1]})`);
        }
        sheetYears = [];
        for (let c = 2; values[c]; c++) sheetYears.push(Number(values[c]));
        if (sheetYears.some((y) => !Number.isInteger(y))) {
          throw new CbsFormatError(`${title}: non-numeric year header`);
        }
        if (years && years.join() !== sheetYears.join()) {
          throw new CbsFormatError(`${title}: year columns differ from other sheets`);
        }
        years = sheetYears;
        continue;
      }
      if (!sheetYears) throw new CbsFormatError(`${title}: header row ${HEADER_ROW} missing`);
      const name = values[0];
      if (!name) continue;
      const where = `${title} row ${number}`;
      const total = values[1] ?? '';
      if (!NUMBER.test(total))
        throw new CbsFormatError(`${where}: bad total ${JSON.stringify(total)}`);
      const cells = sheetYears.map((_, i) => parseCell(values[i + 2] ?? '', where));
      rows.push({ ...layout, name, total: toNumber(total), cells });
    }
  }

  const missing = Object.keys(SHEET_LAYOUT).filter((t) => !seen.has(t));
  if (missing.length) throw new CbsFormatError(`Missing sheets: ${missing.join(', ')}`);
  return { years: years!, rows };
}

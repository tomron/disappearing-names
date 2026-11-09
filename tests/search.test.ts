import { describe, expect, it } from 'vitest';
import type { IndexRow } from '../src/data/types';
import { normalizeName } from '../src/lib/hebrew';
import { createSearch } from '../src/lib/search';

const index: IndexRow[] = [
  ['דוד', 900, 1],
  ['דנה', 800, 1],
  ['דניאל', 700, 1],
  ['נועם', 600, 1],
  ["ג'ורג'", 500, 1],
  ['אברהם', 400, 1],
  ['נדירה', 6, 0],
  ['חולוד', 300, 1],
  ["ח'ולוד", 20, 1],
];
const search = createSearch(index);

describe('normalizeName', () => {
  it('strips niqqud, punctuation and folds final letters', () => {
    expect(normalizeName('דָּוִד')).toBe('דוד');
    expect(normalizeName("ג'ורג'")).toBe('גורג');
    expect(normalizeName('נועם')).toBe('נועמ');
  });
});

describe('createSearch', () => {
  it('matches by prefix, in popularity order', () => {
    expect(search.suggest('ד').map((r) => r[0])).toEqual(['דוד', 'דנה', 'דניאל']);
    expect(search.suggest('דנ').map((r) => r[0])).toEqual(['דנה', 'דניאל']);
  });

  it('ignores niqqud and quotes in the query', () => {
    expect(search.suggest('דָּנ').map((r) => r[0])).toEqual(['דנה', 'דניאל']);
    expect(search.suggest('גורג').map((r) => r[0])).toEqual(["ג'ורג'"]);
  });

  it('treats a final letter and its regular form alike', () => {
    expect(search.suggest('נועמ').map((r) => r[0])).toEqual(['נועם']);
  });

  it('respects the limit and returns nothing for an empty or unknown query', () => {
    expect(search.suggest('ד', 2)).toHaveLength(2);
    expect(search.suggest('')).toEqual([]);
    expect(search.suggest('זזז')).toEqual([]);
  });

  it('keeps names with no yearly series searchable', () => {
    expect(search.suggest('נדי')[0]).toEqual(['נדירה', 6, 0]);
  });

  it('resolves an exact spelling even when a more popular variant normalizes the same', () => {
    expect(search.find("ח'ולוד")?.[0]).toBe("ח'ולוד");
    expect(search.find('חולוד')?.[0]).toBe('חולוד');
    expect(search.find('ח׳ולוד')?.[0]).toBe('חולוד'); // other punctuation falls back to the popular one
  });

  it('finds an exact name for deep links', () => {
    expect(search.find('דָּוִד')?.[0]).toBe('דוד');
    expect(search.find('דו')).toBeUndefined();
  });
});

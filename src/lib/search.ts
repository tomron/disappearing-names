import type { IndexRow } from '../data/types';
import { normalizeName } from './hebrew';

/** Prefix search over the name index, which is already ordered by popularity. */
export function createSearch(index: IndexRow[]) {
  const keys = index.map((row) => normalizeName(row[0]));
  // Spelling variants can normalize to the same key (חולוד and ח'ולוד), so exact names win.
  const exact = new Map(index.map((row) => [row[0], row]));
  return {
    suggest(query: string, limit = 8): IndexRow[] {
      const q = normalizeName(query);
      if (!q) return [];
      const out: IndexRow[] = [];
      for (let i = 0; i < index.length && out.length < limit; i++) {
        if (keys[i].startsWith(q)) out.push(index[i]);
      }
      return out;
    },
    /** Resolves a typed or linked name: the exact spelling first, else the most popular match once normalized. */
    find(query: string): IndexRow | undefined {
      const hit = exact.get(query.trim());
      if (hit) return hit;
      const q = normalizeName(query);
      if (!q) return undefined;
      const i = keys.indexOf(q);
      return i === -1 ? undefined : index[i];
    },
  };
}

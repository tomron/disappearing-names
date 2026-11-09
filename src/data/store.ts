import { shardOf } from './shard';
import type { IndexRow, Meta, Movers, NameEntry, Shard } from './types';

export type Fetch = (url: string) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;

/** Lazy, cached access to the static JSON built by `npm run build:data`. */
export function createStore(base: string, fetchImpl: Fetch = (u) => fetch(u)) {
  const cache = new Map<string, Promise<unknown>>();

  function get<T>(path: string): Promise<T> {
    let hit = cache.get(path);
    if (!hit) {
      hit = fetchImpl(`${base}data/${path}`)
        .then((r) => {
          if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
          return r.json();
        })
        .catch((e) => {
          cache.delete(path); // allow a retry after a failure
          throw e;
        });
      cache.set(path, hit);
    }
    return hit as Promise<T>;
  }

  return {
    meta: () => get<Meta>('meta.json'),
    index: () => get<IndexRow[]>('index.json'),
    movers: () => get<Movers>('movers.json'),
    /** Yearly series for one name, or null when it has none (below the publication threshold). */
    async series(name: string): Promise<NameEntry | null> {
      const shard = await get<Shard>(`series/${shardOf(name)}.json`);
      return shard[name] ?? null;
    },
  };
}

export type Store = ReturnType<typeof createStore>;

export const store = createStore(import.meta.env.BASE_URL);

import { describe, expect, it, vi } from 'vitest';
import { createStore, type Fetch } from '../src/data/store';
import { shardOf } from '../src/data/shard';

function fakeFetch(files: Record<string, unknown>) {
  const impl = vi.fn<Fetch>(async (url) => {
    const path = url.replace('/base/data/', '');
    return path in files
      ? { ok: true, status: 200, json: async () => files[path] }
      : { ok: false, status: 404, json: async () => ({}) };
  });
  return impl;
}

describe('data store', () => {
  it('fetches each file once and caches it', async () => {
    const f = fakeFetch({ 'meta.json': { release: '391/2025' } });
    const store = createStore('/base/', f);
    await Promise.all([store.meta(), store.meta()]);
    await store.meta();
    expect(f).toHaveBeenCalledTimes(1);
    expect(f).toHaveBeenCalledWith('/base/data/meta.json');
  });

  it('looks a name up in the shard for its first character', async () => {
    const entry = { total: 7, residual: 0, slices: {} };
    const f = fakeFetch({ [`series/${shardOf('שרון')}.json`]: { שרון: entry, שי: { total: 1 } } });
    const store = createStore('/base/', f);
    expect(await store.series('שרון')).toEqual(entry);
    expect(await store.series('שירה')).toBeNull(); // same shard, no series
    expect(f).toHaveBeenCalledTimes(1); // second lookup reused the shard
  });

  it('does not cache failures, so a retry can succeed', async () => {
    const files: Record<string, unknown> = {};
    const f = fakeFetch(files);
    const store = createStore('/base/', f);
    await expect(store.index()).rejects.toThrow(/HTTP 404/);
    files['index.json'] = [['דנה', 5, 1]];
    expect(await store.index()).toEqual([['דנה', 5, 1]]);
  });
});

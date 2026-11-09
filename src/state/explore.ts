import { signal } from '@preact/signals';
import type { Mode } from '../lib/series';
import { isSector, isSex, sector, sex } from './filters';
import { useUrlSync } from './urlSync';

/** Explore view state; sector and sex are shared with the other views (see filters.ts). */
export const name = signal('');
export const mode = signal<Mode>('count');
export const split = signal(false);

export function toParams(): URLSearchParams {
  const p = new URLSearchParams();
  if (name.value) p.set('name', name.value);
  if (sector.value !== 'all') p.set('sector', sector.value);
  if (sex.value !== 'all') p.set('sex', sex.value);
  if (mode.value !== 'count') p.set('mode', mode.value);
  if (split.value) p.set('split', '1');
  return p;
}

export function applyParams(p: URLSearchParams) {
  name.value = p.get('name') ?? '';
  const s = p.get('sector');
  sector.value = isSector(s) ? s : 'all';
  const x = p.get('sex');
  sex.value = isSex(x) ? x : 'all';
  mode.value = p.get('mode') === 'share' ? 'share' : 'count';
  split.value = p.get('split') === '1';
}

export const useExploreUrlSync = () => useUrlSync(toParams, applyParams);

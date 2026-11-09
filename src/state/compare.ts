import { signal } from '@preact/signals';
import type { Mode } from '../lib/series';
import { isSector, isSex, sector, sex } from './filters';
import { useUrlSync } from './urlSync';

export const MAX_NAMES = 5;

/** Compare view state; sector and sex are shared with the other views (see filters.ts). */
export const names = signal<string[]>([]);
export const mode = signal<Mode>('count');
/** First and last year shown, or null for the full range. */
export const fromYear = signal<number | null>(null);
export const toYear = signal<number | null>(null);
/** Tables hide names whose highest yearly count is below this. */
export const minPeak = signal(0);

const num = (v: string | null) => (v !== null && /^\d+$/.test(v) ? Number(v) : null);

export function toParams(): URLSearchParams {
  const p = new URLSearchParams();
  if (names.value.length) p.set('names', names.value.join(','));
  if (sector.value !== 'all') p.set('sector', sector.value);
  if (sex.value !== 'all') p.set('sex', sex.value);
  if (mode.value !== 'count') p.set('mode', mode.value);
  if (fromYear.value !== null) p.set('from', String(fromYear.value));
  if (toYear.value !== null) p.set('to', String(toYear.value));
  if (minPeak.value > 0) p.set('min', String(minPeak.value));
  return p;
}

export function applyParams(p: URLSearchParams) {
  const raw = p.get('names');
  names.value = raw ? [...new Set(raw.split(',').filter(Boolean))].slice(0, MAX_NAMES) : [];
  const s = p.get('sector');
  sector.value = isSector(s) ? s : 'all';
  const x = p.get('sex');
  sex.value = isSex(x) ? x : 'all';
  mode.value = p.get('mode') === 'share' ? 'share' : 'count';
  fromYear.value = num(p.get('from'));
  toYear.value = num(p.get('to'));
  minPeak.value = num(p.get('min')) ?? 0;
}

export const useCompareUrlSync = () => useUrlSync(toParams, applyParams);

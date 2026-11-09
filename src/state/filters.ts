import { computed, signal } from '@preact/signals';
import type { SectorKey, SexKey, SliceKey } from '../data/types';

/** Filters shared by the Explore, Discover and Compare views. */
export const sector = signal<SectorKey>('all');
export const sex = signal<SexKey>('all');

export const slice = computed<SliceKey>(() => `${sector.value}/${sex.value}`);

export const SECTORS: SectorKey[] = ['all', 'jewish', 'muslim', 'christian', 'druze'];
export const SEXES: SexKey[] = ['all', 'F', 'M'];

export const isSector = (v: unknown): v is SectorKey => SECTORS.includes(v as SectorKey);
export const isSex = (v: unknown): v is SexKey => SEXES.includes(v as SexKey);

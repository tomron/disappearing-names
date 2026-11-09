import type { SectorKey, SexKey } from '../data/types';

export const sectorLabel: Record<SectorKey, string> = {
  all: 'כלל האוכלוסייה',
  jewish: 'יהודים',
  muslim: 'מוסלמים',
  christian: 'נוצרים ערבים',
  druze: 'דרוזים',
};

export const sexLabel: Record<SexKey, string> = {
  all: 'בנים ובנות',
  F: 'בנות',
  M: 'בנים',
};

const number = new Intl.NumberFormat('he-IL');
export const formatNumber = (n: number) => number.format(Math.round(n));
export const formatPercent = (ratio: number) => `${number.format(Math.round(ratio * 100))}%`;
/** Share of births as a percentage with sensible precision, for example 0.4% or 1.8%. */
export function formatShare(share: number): string {
  if (share > 0 && share < 0.0001) return '<0.01%'; // would round to a misleading 0%
  const digits = share < 0.01 ? 2 : 1;
  return `${new Intl.NumberFormat('he-IL', { maximumFractionDigits: digits }).format(share * 100)}%`;
}

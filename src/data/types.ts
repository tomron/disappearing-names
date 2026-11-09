export type Sector = 'jewish' | 'muslim' | 'christian' | 'druze';
export type Sex = 'F' | 'M';
export type SectorKey = Sector | 'all';
export type SexKey = Sex | 'all';
export type SliceKey = `${SectorKey}/${SexKey}`;

export interface CbsSource {
  release: string;
  title: string;
  file: string;
  /** Date the file was downloaded from CBS (YYYY-MM-DD). */
  retrieved: string;
  url: string;
  licenseUrl: string;
}

export interface Meta {
  release: string;
  cbs: CbsSource;
  source: string;
  firstYear: number;
  lastYear: number;
  builtAt: string;
  sectors: Sector[];
  sexes: Sex[];
  slices: SliceKey[];
  suppressedMax: number;
  publishedMin: number;
  denominator: string;
  config: {
    windowYears: number;
    minPeakCount: number;
    fallRatio: number;
    riseRatio: number;
    moversPerSlice: number;
  };
  /** Estimated births per year, by slice. */
  births: Record<SliceKey, number[]>;
}

/** [name, all-years total, 1 when a yearly series exists]. */
export type IndexRow = [name: string, total: number, hasSeries: 0 | 1];

export interface SliceSeries {
  /** Published births per year (counts of 5 or more). */
  n: number[];
  /** Number of suppressed cells (1 to 4 births each) per year. */
  s: number[];
}

export interface NameEntry {
  total: number;
  /** Births in `total` that the yearly cells cannot account for (likely before 1949). */
  residual: number;
  slices: Partial<Record<SliceKey, SliceSeries>>;
}

export type Shard = Record<string, NameEntry>;

export interface Mover {
  name: string;
  peakYear: number;
  peakCount: number;
  baselineShare: number;
  recentShare: number;
  change: number;
  vanished: boolean;
  /** Mean share of births per 4-year bin from the first year, scaled so the highest bin is 100. */
  spark: number[];
}

export type Movers = Record<SliceKey, { risers: Mover[]; fallers: Mover[] }>;

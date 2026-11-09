/** Tunable thresholds for "big change" detection. Recorded in meta.json on every build. */
export const metricsConfig = {
  /** Length in years of the windows compared (peak window, recent window, earlier windows). */
  windowYears: 10,
  /** A name needs an estimated yearly count of at least this to appear in rankings and picks. */
  minPeakCount: 30,
  /** Faller: recent share is at most this fraction of its peak-window share. */
  fallRatio: 0.2,
  /** Riser: recent share is at least this multiple of its lowest earlier-window share. */
  riseRatio: 5,
  /** Entries kept per slice in movers.json for each of risers and fallers. */
  moversPerSlice: 200,
};

export type MetricsConfig = typeof metricsConfig;

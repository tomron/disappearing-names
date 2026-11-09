interface Props {
  /** Values scaled 0-100, one per time bin, oldest first. */
  values: number[];
  width?: number;
  height?: number;
}

/** A tiny decorative line of a name's history; the card text carries the meaning. */
export function Sparkline({ values, width = 120, height = 36 }: Props) {
  const pad = 2;
  const step = (width - pad * 2) / Math.max(1, values.length - 1);
  const y = (v: number) => height - pad - (v / 100) * (height - pad * 2);
  const points = values
    .map((v, i) => `${(pad + i * step).toFixed(1)},${y(v).toFixed(1)}`)
    .join(' ');
  return (
    <svg
      class="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linejoin="round"
      />
    </svg>
  );
}

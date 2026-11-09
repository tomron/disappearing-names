import { render } from 'preact';
import { Chart, type ChartSeries } from '../../src/components/Chart';
import { shardOf } from '../../src/data/shard';
import type { Meta, Shard } from '../../src/data/types';
import '../../src/app.css';

const meta: Meta = await (await fetch('/data/meta.json')).json();
const years = Array.from(
  { length: meta.lastYear - meta.firstYear + 1 },
  (_, i) => meta.firstYear + i,
);
const series: ChartSeries[] = [];
for (const name of ['שרון', 'נועם', 'קרן']) {
  const shard: Shard = await (await fetch(`/data/series/${shardOf(name)}.json`)).json();
  const e = shard[name].slices['all/all']!;
  series.push({
    name,
    values: e.n.map((n, i) => n + e.s[i] * 2.5),
    suppressed: e.s.map((s, i) => s > 0 && e.n[i] === 0),
  });
}
render(
  <Chart years={years} series={series} summary="שרון, נועם וקרן" />,
  document.getElementById('app')!,
);

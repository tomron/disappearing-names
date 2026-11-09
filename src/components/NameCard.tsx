import type { Mover } from '../data/types';
import { cardText, sectionOf } from '../lib/cards';
import { href, navigate } from '../router';
import { sector, sex } from '../state/filters';
import { Sparkline } from './Sparkline';

interface Props {
  mover: Mover;
  lastYear: number;
}

/** Link target that opens the name in the explorer with the active filters applied. */
export function exploreParams(name: string): Record<string, string> {
  const p: Record<string, string> = { name };
  if (sector.value !== 'all') p.sector = sector.value;
  if (sex.value !== 'all') p.sex = sex.value;
  return p;
}

export function NameCard({ mover, lastYear }: Props) {
  const params = exploreParams(mover.name);
  return (
    <li class={`card ${sectionOf(mover)}`}>
      <a
        href={href('explore', params)}
        onClick={(e) => {
          if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
          e.preventDefault();
          navigate('explore', params);
        }}
      >
        <span class="card-name">{mover.name}</span>
        <Sparkline values={mover.spark} />
        <span class="card-text">{cardText(mover, lastYear)}</span>
      </a>
    </li>
  );
}

import { describe, expect, it } from 'vitest';
import { formatShare } from '../src/lib/labels';

describe('formatShare', () => {
  it('formats shares of births as percentages', () => {
    expect(formatShare(0.018)).toBe('1.8%');
    expect(formatShare(0.0042)).toBe('0.42%');
    expect(formatShare(0)).toBe('0%');
  });

  it('does not show a tiny non-zero share as 0%', () => {
    expect(formatShare(0.00002)).toBe('<0.01%');
  });
});

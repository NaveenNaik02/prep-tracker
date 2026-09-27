import { describe, expect, it } from 'vitest';
import type { SectionMeta } from '@/lib/content/topics';
import { matchSubtopic } from './matchSubtopic';

const arrays = {
  topic: 'dsa',
  file: 'arrays',
  label: 'Arrays & Hashing',
} as SectionMeta;

describe('matchSubtopic', () => {
  it('matches exactly', () => {
    expect(matchSubtopic([arrays], 'Arrays & Hashing')).toBe(arrays);
  });

  it('ignores case and padding', () => {
    expect(matchSubtopic([arrays], '  arrays & hashing ')).toBe(arrays);
  });

  it('misses a genuinely new name', () => {
    expect(matchSubtopic([arrays], 'Linked List')).toBeUndefined();
  });
});

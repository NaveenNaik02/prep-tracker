import { describe, it, expect } from 'vitest';
import { parsePrereqs, formatPrereqs } from './splitList';

describe('parsePrereqs', () => {
  it('reads plain names, the shape every pre-existing row has', () => {
    expect(parsePrereqs('Two Pointers, Hash Set')).toEqual([
      { text: 'Two Pointers' },
      { text: 'Hash Set' },
    ]);
  });

  it('splits an attached link off the name', () => {
    expect(parsePrereqs('Bubble Sort, notes|https://ex.com/a')).toEqual([
      { text: 'Bubble Sort' },
      { text: 'notes', link: 'https://ex.com/a' },
    ]);
  });

  it('drops empties and keeps a bare link usable', () => {
    expect(parsePrereqs(' , Sorting , |https://ex.com/b')).toEqual([
      { text: 'Sorting' },
      { text: 'https://ex.com/b', link: 'https://ex.com/b' },
    ]);
  });

  it('round-trips through formatPrereqs', () => {
    const csv = 'Bubble Sort, notes|https://ex.com/a';
    expect(formatPrereqs(parsePrereqs(csv))).toBe(csv);
  });
});

import { describe, expect, it } from 'vitest';
import { RingBuffer } from '../../src/logs/RingBuffer';

describe('RingBuffer', () => {
  it('stores items in insertion order', () => {
    const buf = new RingBuffer<number>(4);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    expect(buf.toArray()).toEqual([1, 2, 3]);
    expect(buf.length).toBe(3);
  });

  it('overwrites the oldest entry when full', () => {
    const buf = new RingBuffer<number>(3);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    buf.push(4);
    expect(buf.toArray()).toEqual([2, 3, 4]);
    expect(buf.length).toBe(3);
  });

  it('clears all entries', () => {
    const buf = new RingBuffer<number>(2);
    buf.push(1);
    buf.push(2);
    buf.clear();
    expect(buf.toArray()).toEqual([]);
    expect(buf.length).toBe(0);
  });

  it('returns undefined for out of range indexes', () => {
    const buf = new RingBuffer<string>(2);
    buf.push('a');
    expect(buf.at(0)).toBe('a');
    expect(buf.at(1)).toBeUndefined();
  });
});

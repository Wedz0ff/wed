import { describe, expect, it } from 'vitest';
import { highlightedSegments } from '../../src/components/LogLine';
import { formatUptime } from '../../src/app/state';

describe('highlightedSegments', () => {
  it('splits a line around case-insensitive matches', () => {
    expect(highlightedSegments('Hello postgres world', 'POSTGRES')).toEqual([
      { text: 'Hello ', hit: false },
      { text: 'postgres', hit: true },
      { text: ' world', hit: false },
    ]);
  });
});

describe('formatUptime', () => {
  it('formats hours, minutes, and seconds', () => {
    expect(formatUptime(0)).toBe('00:00:00');
    expect(formatUptime(62_000)).toBe('00:01:02');
    expect(formatUptime(3_661_000)).toBe('01:01:01');
  });
});

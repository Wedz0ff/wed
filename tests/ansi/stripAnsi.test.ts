import { describe, expect, it } from 'vitest';
import { stripAnsi } from '../../src/ansi/stripAnsi';

describe('stripAnsi', () => {
  it('removes CSI color sequences and leaves text', () => {
    expect(stripAnsi('\u001b[31mred\u001b[0m')).toBe('red');
  });

  it('returns the original string when there is no ANSI', () => {
    expect(stripAnsi('plain')).toBe('plain');
  });
});

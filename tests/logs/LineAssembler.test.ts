import { describe, expect, it } from 'vitest';
import { LineAssembler } from '../../src/logs/LineAssembler';

describe('LineAssembler', () => {
  it('splits complete lines on newline', () => {
    const assembler = new LineAssembler();
    expect(assembler.push('hello\nworld\n')).toEqual(['hello', 'world']);
  });

  it('holds incomplete lines until a newline arrives', () => {
    const assembler = new LineAssembler();
    expect(assembler.push('hel')).toEqual([]);
    expect(assembler.push('lo\n')).toEqual(['hello']);
  });

  it('strips trailing carriage returns', () => {
    const assembler = new LineAssembler();
    expect(assembler.push('hello\r\n')).toEqual(['hello']);
  });

  it('flushes a leftover incomplete line', () => {
    const assembler = new LineAssembler();
    assembler.push('partial');
    expect(assembler.flush()).toBe('partial');
    expect(assembler.flush()).toBeUndefined();
  });
});

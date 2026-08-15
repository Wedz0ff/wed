import { describe, expect, it } from 'vitest';
import { parseLogLine } from '../../src/logs/LogParser';

describe('parseLogLine', () => {
  it('detects INFO and strips the level prefix', () => {
    const entry = parseLogLine('INFO Server started', 1000, 1);
    expect(entry).toMatchObject({
      id: 1,
      timestamp: 1000,
      level: 'info',
      message: 'Server started',
      raw: 'INFO Server started',
    });
  });

  it('detects bracketed and colon-delimited levels', () => {
    expect(parseLogLine('[ERROR] boom').level).toBe('error');
    expect(parseLogLine('WARN: slow').level).toBe('warn');
    expect(parseLogLine('DEBUG GET /api').level).toBe('debug');
    expect(parseLogLine('TRACE start').level).toBe('trace');
  });

  it('treats arbitrary output as unknown and keeps the raw value', () => {
    const entry = parseLogLine('just some text');
    expect(entry.level).toBe('unknown');
    expect(entry.message).toBe('just some text');
    expect(entry.raw).toBe('just some text');
  });

  it('parses levels after stripping ANSI from the message', () => {
    const raw = '\u001b[32mINFO\u001b[0m Server started';
    const entry = parseLogLine(raw);
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('Server started');
    expect(entry.raw).toBe(raw);
  });
});

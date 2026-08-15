import { describe, expect, it } from 'vitest';
import { extractStack } from '../../src/logs/StackTrace';
import type { LogEntry } from '../../src/logs/types';

function line(id: number, message: string, level: LogEntry['level'] = 'error'): LogEntry {
  return { id, timestamp: 0, level, message, raw: message };
}

describe('extractStack', () => {
  it('groups following at-frames after an error line', () => {
    const entries: LogEntry[] = [
      line(1, 'Connection refused'),
      line(2, 'Error: connect ECONNREFUSED 127.0.0.1:5432', 'unknown'),
      line(3, '    at connect src/db/client.ts:42', 'unknown'),
      line(4, '    at initialize src/app.ts:18', 'unknown'),
      line(5, 'INFO recovered', 'info'),
    ];

    const stack = extractStack(entries, 0);
    expect(stack.title).toBe('Connection refused');
    expect(stack.body).toContain('Error: connect ECONNREFUSED 127.0.0.1:5432');
    expect(stack.frames).toEqual([
      '→ connect src/db/client.ts:42',
      '→ initialize src/app.ts:18',
    ]);
  });

  it('accepts arrow-prefixed frames', () => {
    const entries: LogEntry[] = [
      line(1, 'boom'),
      line(2, '→ connect src/db/client.ts:42', 'unknown'),
    ];
    expect(extractStack(entries, 0).frames).toEqual([
      '→ connect src/db/client.ts:42',
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import { filterLogs } from '../../src/logs/LogFilter';
import type { LogEntry } from '../../src/logs/types';

function entry(
  partial: Partial<LogEntry> & Pick<LogEntry, 'id' | 'message' | 'level'>,
): LogEntry {
  return {
    timestamp: 0,
    raw: partial.message,
    ...partial,
  };
}

describe('filterLogs', () => {
  const logs: LogEntry[] = [
    entry({ id: 1, level: 'info', message: 'Server started' }),
    entry({ id: 2, level: 'debug', message: 'GET /api/users' }),
    entry({ id: 3, level: 'error', message: 'Connection refused postgres' }),
    entry({ id: 4, level: 'unknown', message: 'noise' }),
  ];

  it('returns every entry for level all', () => {
    expect(filterLogs(logs, { level: 'all' }).map((e) => e.id)).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it('matches a single level exactly', () => {
    expect(filterLogs(logs, { level: 'error' }).map((e) => e.id)).toEqual([3]);
  });

  it('hides unknown entries unless the level is all', () => {
    expect(filterLogs(logs, { level: 'info' }).map((e) => e.id)).toEqual([1]);
  });

  it('filters by case-insensitive substring', () => {
    expect(
      filterLogs(logs, { query: 'POSTGRES' }).map((e) => e.id),
    ).toEqual([3]);
  });

  it('combines text and level filters', () => {
    expect(
      filterLogs(logs, { query: 'server', level: 'info' }).map((e) => e.id),
    ).toEqual([1]);
    expect(
      filterLogs(logs, { query: 'server', level: 'error' }).map((e) => e.id),
    ).toEqual([]);
  });
});

import type { LogEntry, LogFilter } from './types';

export function filterLogs(
  entries: LogEntry[],
  filter: LogFilter = {},
): LogEntry[] {
  const query = filter.query?.trim().toLowerCase();
  const level = filter.level ?? 'all';

  return entries.filter((entry) => {
    if (level !== 'all' && entry.level !== level) {
      return false;
    }
    if (!query) {
      return true;
    }
    return (
      entry.message.toLowerCase().includes(query) ||
      entry.raw.toLowerCase().includes(query)
    );
  });
}

export function findMatchIndexes(entries: LogEntry[], query: string): number[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [];
  }
  const indexes: number[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    if (
      entry.message.toLowerCase().includes(q) ||
      entry.raw.toLowerCase().includes(q)
    ) {
      indexes.push(i);
    }
  }
  return indexes;
}

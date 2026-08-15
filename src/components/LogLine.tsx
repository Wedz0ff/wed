import { Text } from 'ink';
import type { LogEntry } from '../logs/types';
import type { Theme } from '../themes/types';

interface LogLineProps {
  entry: LogEntry;
  selected: boolean;
  searchQuery: string;
  theme: Theme;
}

const LEVEL_PAD = 5;

export function LogLine({ entry, selected, searchQuery, theme }: LogLineProps) {
  const time = formatTime(entry.timestamp);
  const level = entry.level.toUpperCase().padEnd(LEVEL_PAD);
  const color = levelColor(entry.level, theme);
  const segments = highlightedSegments(entry.message, searchQuery);

  return (
    <Text inverse={selected}>
      <Text color={theme.muted}>{time}  </Text>
      <Text color={color}>{level}  </Text>
      {segments.map((segment, index) => (
        <Text
          key={`${entry.id}-${index}`}
          color={segment.hit ? theme.background : theme.foreground}
          backgroundColor={segment.hit ? theme.primary : undefined}
        >
          {segment.text}
        </Text>
      ))}
    </Text>
  );
}

function levelColor(level: LogEntry['level'], theme: Theme): string {
  switch (level) {
    case 'error':
      return theme.error;
    case 'warn':
      return theme.warning;
    case 'info':
      return theme.info;
    case 'debug':
    case 'trace':
      return theme.debug;
    default:
      return theme.muted;
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

export function highlightedSegments(
  message: string,
  query: string,
): Array<{ text: string; hit: boolean }> {
  const q = query.trim();
  if (!q) {
    return [{ text: message, hit: false }];
  }
  const lower = message.toLowerCase();
  const needle = q.toLowerCase();
  const segments: Array<{ text: string; hit: boolean }> = [];
  let cursor = 0;
  let index = lower.indexOf(needle, cursor);
  while (index !== -1) {
    if (index > cursor) {
      segments.push({ text: message.slice(cursor, index), hit: false });
    }
    segments.push({
      text: message.slice(index, index + q.length),
      hit: true,
    });
    cursor = index + q.length;
    index = lower.indexOf(needle, cursor);
  }
  if (cursor < message.length) {
    segments.push({ text: message.slice(cursor), hit: false });
  }
  return segments;
}

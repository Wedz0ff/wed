import { stripAnsi } from '../ansi/stripAnsi';
import type { LogEntry, LogLevel } from './types';

const LEVEL_ALIASES: Record<string, LogLevel> = {
  trace: 'trace',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  warning: 'warn',
  error: 'error',
  err: 'error',
};

const LEVEL_PATTERN =
  /^(?:\[)?(trace|debug|info|warn|warning|error|err)(?:\])?(?:[:\s-]|$)/i;

export function parseLogLine(
  raw: string,
  timestamp: number = Date.now(),
  id: number = 0,
): LogEntry {
  const stripped = stripAnsi(raw);
  const detected = detectLevel(stripped);
  return {
    id,
    timestamp,
    level: detected.level,
    message: detected.message,
    raw,
  };
}

function detectLevel(text: string): { level: LogLevel; message: string } {
  const trimmed = text.trimStart();
  const match = trimmed.match(LEVEL_PATTERN);
  if (!match) {
    return { level: 'unknown', message: strippedOrOriginal(text, trimmed) };
  }
  const token = match[1]!.toLowerCase();
  const level = LEVEL_ALIASES[token] ?? 'unknown';
  const rest = trimmed.slice(match[0].length).trimStart();
  return { level, message: rest.length > 0 ? rest : trimmed };
}

function strippedOrOriginal(text: string, trimmed: string): string {
  return trimmed.length > 0 ? trimmed : text;
}

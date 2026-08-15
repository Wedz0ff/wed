import type { LogEntry } from './types';

export interface ExtractedStack {
  title: string;
  body: string[];
  frames: string[];
}

const FRAME_PATTERN = /^\s*(?:at |→|→ )/;
const ERROR_BODY_PATTERN = /^(?:Error:|\s{2,})/;

export function extractStack(
  entries: LogEntry[],
  errorIndex: number,
): ExtractedStack {
  const error = entries[errorIndex];
  if (!error) {
    return { title: '', body: [], frames: [] };
  }

  const body: string[] = [error.message];
  const frames: string[] = [];

  for (let i = errorIndex + 1; i < entries.length && i <= errorIndex + 40; i++) {
    const message = entries[i]!.message;
    const trimmed = message.trim();
    if (FRAME_PATTERN.test(message) || /^\s*at\s+/.test(message)) {
      frames.push(normalizeFrame(trimmed));
      continue;
    }
    if (frames.length > 0) {
      break;
    }
    if (ERROR_BODY_PATTERN.test(message)) {
      body.push(trimmed);
      continue;
    }
    break;
  }

  return { title: error.message, body, frames };
}

function normalizeFrame(trimmed: string): string {
  const withoutAt = trimmed.replace(/^at\s+/, '').replace(/^→\s*/, '');
  return `→ ${withoutAt}`;
}

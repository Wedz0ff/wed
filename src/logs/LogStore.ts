import { parseLogLine } from './LogParser';
import { RingBuffer } from './RingBuffer';
import type { LogEntry, LogLevel } from './types';

export const DEFAULT_LOG_CAPACITY = 50_000;

export class LogStore {
  private readonly buffer: RingBuffer<LogEntry>;
  private nextId = 1;

  constructor(capacity: number = DEFAULT_LOG_CAPACITY) {
    this.buffer = new RingBuffer<LogEntry>(capacity);
  }

  get length(): number {
    return this.buffer.length;
  }

  appendRaw(raw: string, timestamp: number = Date.now()): LogEntry {
    const parsed = parseLogLine(raw, timestamp, this.nextId++);
    this.buffer.push(parsed);
    return parsed;
  }

  appendSynthetic(
    message: string,
    level: LogLevel = 'info',
    timestamp: number = Date.now(),
  ): LogEntry {
    const entry: LogEntry = {
      id: this.nextId++,
      timestamp,
      level,
      message,
      raw: message,
    };
    this.buffer.push(entry);
    return entry;
  }

  toArray(): LogEntry[] {
    return this.buffer.toArray();
  }

  clear(): void {
    this.buffer.clear();
  }
}

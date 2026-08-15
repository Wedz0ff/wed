export type LogLevel =
  | 'trace'
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'unknown';

export interface LogEntry {
  id: number;
  timestamp: number;
  level: LogLevel;
  message: string;
  raw: string;
}

export interface LogFilter {
  query?: string;
  level?: LogLevel | 'all';
}

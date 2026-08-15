import type { Theme } from '../themes/types';

export interface WebLogDto {
  id: number;
  timestamp: number;
  level: string;
  message: string;
}

export interface WebSnapshot {
  command: string;
  args: string[];
  status: string;
  theme: Theme;
  logs: WebLogDto[];
}

export interface WebSessionView {
  getWebSnapshot(): WebSnapshot;
  subscribe(listener: () => void): () => void;
  logsSince(afterId: number): WebLogDto[];
}

export interface WebServer {
  url: string;
  host: string;
  port: number;
  close(): Promise<void>;
}

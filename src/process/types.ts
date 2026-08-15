export type ProcessStatus =
  | 'starting'
  | 'running'
  | 'exited'
  | 'failed'
  | 'terminating';

export interface ExitEvent {
  exitCode: number;
  signal?: number;
}

export interface Disposable {
  dispose(): void;
}

export interface SpawnOptions {
  command: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  cols: number;
  rows: number;
}

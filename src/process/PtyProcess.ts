import pty from 'node-pty';
import type { IPty } from 'node-pty';
import type { Disposable, ExitEvent, SpawnOptions } from './types';

export function cleanEnv(
  env: NodeJS.ProcessEnv = process.env,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

export class PtyProcess {
  private constructor(private readonly term: IPty) {}

  static spawn(options: SpawnOptions): PtyProcess {
    const term = pty.spawn(options.command, options.args, {
      name: 'xterm-256color',
      cols: options.cols,
      rows: options.rows,
      cwd: options.cwd ?? process.cwd(),
      env: {
        ...cleanEnv(options.env ?? process.env),
        TERM: 'xterm-256color',
      },
      encoding: 'utf8',
    });
    return new PtyProcess(term);
  }

  get pid(): number {
    return this.term.pid;
  }

  write(data: string): void {
    this.term.write(data);
  }

  resize(cols: number, rows: number): void {
    this.term.resize(cols, rows);
  }

  kill(signal?: string): void {
    this.term.kill(signal);
  }

  onData(listener: (data: string) => void): Disposable {
    return this.term.onData(listener);
  }

  onExit(listener: (event: ExitEvent) => void): Disposable {
    return this.term.onExit(listener);
  }
}

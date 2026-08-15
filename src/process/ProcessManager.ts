import { PtyProcess } from './PtyProcess';
import type {
  Disposable,
  ExitEvent,
  ProcessStatus,
  SpawnOptions,
} from './types';

const EXIT_WAIT_MS = 3_000;

export class ProcessManager {
  private pty: PtyProcess | undefined;
  private disposables: Disposable[] = [];
  private spawnOptions: SpawnOptions | undefined;
  private exitWaiter: Promise<ExitEvent> | undefined;
  private resolveExit: ((event: ExitEvent) => void) | undefined;

  status: ProcessStatus = 'starting';
  pid: number | undefined;
  exitCode: number | undefined;
  exitSignal: number | undefined;
  startedAt: number | undefined;
  lastError: string | undefined;

  onData: (data: string) => void = () => {};
  onStatus: () => void = () => {};

  start(options: SpawnOptions): void {
    this.spawnOptions = options;
    this.status = 'starting';
    this.exitCode = undefined;
    this.exitSignal = undefined;
    this.lastError = undefined;
    this.pid = undefined;
    this.startedAt = Date.now();
    this.onStatus();

    try {
      this.pty = PtyProcess.spawn(options);
    } catch (error) {
      this.status = 'failed';
      this.lastError = error instanceof Error ? error.message : String(error);
      this.onStatus();
      return;
    }

    this.pid = this.pty.pid;
    this.status = 'running';
    this.exitWaiter = new Promise((resolve) => {
      this.resolveExit = resolve;
    });
    this.disposables.push(
      this.pty.onData((data) => {
        this.onData(data);
      }),
      this.pty.onExit((event) => {
        this.handleExit(event);
      }),
    );
    this.onStatus();
  }

  resize(cols: number, rows: number): void {
    if (this.spawnOptions) {
      this.spawnOptions = { ...this.spawnOptions, cols, rows };
    }
    this.pty?.resize(cols, rows);
  }

  async terminate(signal: string = 'SIGTERM'): Promise<void> {
    if (!this.pty || this.status === 'exited' || this.status === 'failed') {
      return;
    }
    this.status = 'terminating';
    this.onStatus();
    try {
      this.pty.kill(signal);
    } catch {
      // Process may already be gone.
    }

    const exited = await Promise.race([
      this.exitWaiter,
      sleep(EXIT_WAIT_MS).then(() => undefined),
    ]);

    if (!exited && this.pty && this.status === 'terminating') {
      try {
        this.pty.kill('SIGKILL');
      } catch {
        // ignore
      }
      await Promise.race([this.exitWaiter, sleep(500)]);
    }
  }

  async restart(): Promise<void> {
    const options = this.spawnOptions;
    if (!options) {
      return;
    }
    await this.terminate();
    this.disposePty();
    this.start(options);
  }

  private handleExit(event: ExitEvent): void {
    this.exitCode = event.exitCode;
    this.exitSignal = event.signal;
    this.status = event.exitCode === 0 ? 'exited' : 'failed';
    this.pid = undefined;
    this.resolveExit?.(event);
    this.onStatus();
  }

  private disposePty(): void {
    for (const disposable of this.disposables) {
      try {
        disposable.dispose();
      } catch {
        // ignore
      }
    }
    this.disposables = [];
    this.pty = undefined;
    this.resolveExit = undefined;
    this.exitWaiter = undefined;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

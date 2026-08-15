import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { ProcessManager } from '../../src/process/ProcessManager';

const dir = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => path.resolve(dir, '..', 'fixtures', name);

const describePty =
  process.platform === 'win32' ? describe.skip : describe;

describePty('ProcessManager', () => {
  const managers: ProcessManager[] = [];

  afterEach(async () => {
    await Promise.all(managers.splice(0).map((manager) => manager.terminate()));
  });

  it('captures stdout from a node fixture and records a zero exit', async () => {
    const manager = new ProcessManager();
    managers.push(manager);
    let output = '';
    manager.onData = (data) => {
      output += data;
    };
    const exited = waitForStatus(manager, ['exited', 'failed']);
    manager.start({
      command: process.execPath,
      args: [fixture('exit0.mjs')],
      cols: 80,
      rows: 24,
    });
    await exited;
    expect(output).toContain('hello from fixture');
    expect(manager.exitCode).toBe(0);
    expect(manager.status).toBe('exited');
  });

  it('records a non-zero exit code', async () => {
    const manager = new ProcessManager();
    managers.push(manager);
    const exited = waitForStatus(manager, ['failed']);
    manager.start({
      command: process.execPath,
      args: [fixture('exit1.mjs')],
      cols: 80,
      rows: 24,
    });
    await exited;
    expect(manager.exitCode).toBe(1);
    expect(manager.status).toBe('failed');
  });

  it('terminates a long-running process', async () => {
    const manager = new ProcessManager();
    managers.push(manager);
    manager.start({
      command: process.execPath,
      args: ['-e', 'setInterval(() => {}, 1000)'],
      cols: 80,
      rows: 24,
    });
    expect(manager.status).toBe('running');
    expect(manager.pid).toBeGreaterThan(0);
    await manager.terminate();
    expect(['exited', 'failed', 'terminating']).toContain(manager.status);
    expect(manager.pid === undefined || manager.status !== 'running').toBe(
      true,
    );
  });
});

function waitForStatus(
  manager: ProcessManager,
  statuses: string[],
  timeoutMs = 8_000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `timed out waiting for ${statuses.join('|')} (was ${manager.status})`,
        ),
      );
    }, timeoutMs);
    const previous = manager.onStatus;
    manager.onStatus = () => {
      previous();
      if (statuses.includes(manager.status)) {
        clearTimeout(timer);
        resolve();
      }
    };
  });
}

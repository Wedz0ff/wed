import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { Session } from '../../src/session/Session';

const dir = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => path.resolve(dir, '..', 'fixtures', name);

const describePty =
  process.platform === 'win32' ? describe.skip : describe;

describePty('Session + PTY', () => {
  const sessions: Session[] = [];

  afterEach(async () => {
    await Promise.all(sessions.splice(0).map((session) => session.shutdown()));
  });

  it('captures fixture logs through a real PTY', async () => {
    const session = new Session({
      command: process.execPath,
      args: [fixture('logs.mjs')],
      cols: 80,
      rows: 24,
    });
    sessions.push(session);
    const done = waitForExit(session);
    session.start();
    await done;
    await new Promise((resolve) => setTimeout(resolve, 80));
    const messages = session.logs.toArray().map((entry) => entry.message);
    expect(messages.some((line) => line.includes('Server started'))).toBe(true);
    expect(session.logs.toArray().some((entry) => entry.level === 'error')).toBe(
      true,
    );
    expect(session.process.exitCode).toBe(0);
  });
});

function waitForExit(session: Session, timeoutMs = 8_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`timed out (status ${session.process.status})`));
    }, timeoutMs);
    const check = () => {
      if (
        session.process.status === 'exited' ||
        session.process.status === 'failed'
      ) {
        clearTimeout(timer);
        resolve();
      }
    };
    session.subscribe(check);
    check();
  });
}

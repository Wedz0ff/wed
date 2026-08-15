import { afterEach, describe, expect, it } from 'vitest';
import { Session } from '../../src/session/Session';

const sessions: Session[] = [];
afterEach(async () => {
  await Promise.all(sessions.splice(0).map((s) => s.shutdown()));
});

describe('Session web UI', () => {
  it('does not listen when webUi is false', async () => {
    const session = new Session({ command: 'node', args: [], webUi: false });
    sessions.push(session);
    session.start();
    await new Promise((r) => setTimeout(r, 30));
    expect(session.webUrl).toBeUndefined();
  });

  it('listens on start when webUi is enabled', async () => {
    const session = new Session({ command: 'node', args: [], webUi: true });
    sessions.push(session);
    session.start();
    await new Promise((r) => setTimeout(r, 50));
    expect(session.webUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
    const res = await fetch(`${session.webUrl}api/snapshot`);
    expect(res.ok).toBe(true);
  });

  it('starts a one-shot server on openWebUi without writing config', async () => {
    const opened: string[] = [];
    const session = new Session({
      command: 'node',
      args: [],
      webUi: false,
      openBrowser: async (url) => {
        opened.push(url);
      },
    });
    sessions.push(session);
    session.start();
    await session.openWebUi();
    expect(session.webUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
    expect(opened).toEqual([session.webUrl]);
  });
});

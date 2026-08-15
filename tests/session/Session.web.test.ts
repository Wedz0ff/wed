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

  it('sets snapshot webUrl to session.webUrl after openWebUi', async () => {
    const session = new Session({
      command: 'node',
      args: [],
      webUi: false,
      openBrowser: async () => {},
    });
    sessions.push(session);
    await session.openWebUi();
    expect(session.getSnapshot().webUrl).toBe(session.webUrl);
    expect(session.webUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
  });

  it('notifies subscribers after openWebUi so they see webUrl', async () => {
    const session = new Session({
      command: 'node',
      args: [],
      webUi: false,
      openBrowser: async () => {},
    });
    sessions.push(session);
    let seen: string | undefined;
    session.subscribe(() => {
      seen = session.getSnapshot().webUrl;
    });
    await session.openWebUi();
    await new Promise((r) => setTimeout(r, 80));
    expect(seen).toBe(session.webUrl);
    expect(seen).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
  });

  it('notifies subscribers of webError after browser-open failure', async () => {
    const session = new Session({
      command: 'node',
      args: [],
      webUi: false,
      openBrowser: async () => {
        throw new Error('no browser');
      },
    });
    sessions.push(session);
    let seen: string | undefined;
    session.subscribe(() => {
      seen = session.getSnapshot().webError;
    });
    await session.openWebUi();
    await new Promise((r) => setTimeout(r, 80));
    expect(seen).toBe(session.webError);
    expect(seen).toMatch(/^web ui: http:\/\/127\.0\.0\.1:\d+\/$/);
  });

  it('concurrent ensureWebServer calls share one URL', async () => {
    const session = new Session({ command: 'node', args: [], webUi: false });
    sessions.push(session);
    await Promise.all([session.ensureWebServer(), session.ensureWebServer()]);
    expect(session.webUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
    const res = await fetch(`${session.webUrl}api/snapshot`);
    expect(res.ok).toBe(true);
  });

  it('concurrent openWebUi calls open the same URL', async () => {
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
    await Promise.all([session.openWebUi(), session.openWebUi()]);
    expect(opened).toHaveLength(2);
    expect(opened[0]).toBe(opened[1]);
    expect(opened[0]).toBe(session.webUrl);
  });

  it('clears webError on a later successful open when the server is already up', async () => {
    let fail = true;
    const session = new Session({
      command: 'node',
      args: [],
      webUi: false,
      openBrowser: async () => {
        if (fail) throw new Error('no browser');
      },
    });
    sessions.push(session);
    await session.openWebUi();
    expect(session.webError).toMatch(/^web ui: http:\/\/127\.0\.0\.1:\d+\/$/);
    fail = false;
    await session.openWebUi();
    expect(session.webError).toBeUndefined();
    expect(session.getSnapshot().webError).toBeUndefined();
  });

  it('shutdown awaits an in-flight listen and closes that server', async () => {
    const session = new Session({ command: 'node', args: [], webUi: false });
    sessions.push(session);
    const pending = session.ensureWebServer();
    await session.shutdown();
    await pending;
    expect(session.webUrl).toBeUndefined();
    expect(session.getSnapshot().webUrl).toBeUndefined();
  });
});

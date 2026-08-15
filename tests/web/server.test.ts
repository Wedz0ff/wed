import { afterEach, describe, expect, it } from 'vitest';
import { cyberpunk } from '../../src/themes/cyberpunk';
import type { WebSessionView, WebSnapshot } from '../../src/web/types';
import { startWebServer, type WebServer } from '../../src/web/server';

class TestView implements WebSessionView {
  private snap: WebSnapshot;
  private readonly listeners = new Set<() => void>();

  constructor(over: Partial<WebSnapshot> = {}) {
    this.snap = {
      command: 'node',
      args: ['app.js'],
      status: 'RUNNING',
      theme: cyberpunk,
      logs: [
        { id: 1, timestamp: 1, level: 'info', message: 'hello' },
        { id: 2, timestamp: 2, level: 'error', message: 'boom' },
      ],
      ...over,
    };
  }

  getWebSnapshot(): WebSnapshot {
    return this.snap;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  logsSince(afterId: number) {
    return this.snap.logs.filter((l) => l.id > afterId);
  }

  emit(): void {
    for (const fn of this.listeners) fn();
  }

  set(next: WebSnapshot): void {
    this.snap = next;
  }
}

function view(over: Partial<WebSnapshot> = {}): TestView {
  return new TestView(over);
}

const servers: WebServer[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => s.close()));
});

describe('web server', () => {
  it('listens on 127.0.0.1 with an ephemeral port', async () => {
    const server = await startWebServer(view());
    servers.push(server);
    expect(server.host).toBe('127.0.0.1');
    expect(server.port).toBeGreaterThan(0);
    expect(server.url).toBe(`http://127.0.0.1:${server.port}/`);
  });

  it('serves snapshot JSON and themed HTML', async () => {
    const server = await startWebServer(view());
    servers.push(server);
    const snap = (await (
      await fetch(`${server.url}api/snapshot`)
    ).json()) as WebSnapshot;
    expect(snap.command).toBe('node');
    expect(snap.logs[0]).toEqual({
      id: 1,
      timestamp: 1,
      level: 'info',
      message: 'hello',
    });
    expect(snap.theme.primary).toBe(cyberpunk.primary);
    const html = await (await fetch(server.url)).text();
    expect(html).toContain('--wed-background');
    expect(html).toContain('--wed-primary');
    expect(html).toContain('Follow');
    expect(html).toContain('Copy');
    expect(html).toContain('Search');
  });

  it('streams log SSE and honors afterId', async () => {
    const v = view();
    const server = await startWebServer(v);
    servers.push(server);
    const res = await fetch(`${server.url}api/events?afterId=1`);
    expect(res.headers.get('content-type')).toMatch(/text\/event-stream/);
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = '';
    const deadline = Date.now() + 2000;
    while (!buf.includes('event: log') && Date.now() < deadline) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value);
    }
    expect(buf).toContain('event: log');
    expect(buf).toContain('"id":2');
    expect(buf).not.toContain('"id":1');
    await reader.cancel();
  });
});

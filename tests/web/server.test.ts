import { afterEach, describe, expect, it } from 'vitest';
import { cyberpunk } from '../../src/themes/cyberpunk';
import { sakura } from '../../src/themes/sakura';
import type { WebLogDto, WebSessionView, WebSnapshot } from '../../src/web/types';
import {
  afterIdNeedsClear,
  logsWereCleared,
  startWebServer,
  type WebServer,
} from '../../src/web/server';

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
    const { buf, reader } = await readSse(res, (b) => b.includes('event: theme'));
    expect(buf).toContain('event: log');
    expect(buf).toContain('"id":2');
    expect(buf).not.toContain('"id":1');
    await reader.cancel();
  });

  it('emits cleared then new rows when clear and append share one notify', async () => {
    const v = view();
    const server = await startWebServer(v);
    servers.push(server);
    const res = await fetch(`${server.url}api/events?afterId=2`);
    const { reader } = await readSse(res, (b) => b.includes('event: theme'));
    const next = {
      ...v.getWebSnapshot(),
      logs: [
        { id: 10, timestamp: 10, level: 'info', message: 'after clear' },
      ] satisfies WebLogDto[],
    };
    v.set(next);
    v.emit();
    const { buf } = await readSseFrom(reader, (b) =>
      b.includes('event: log') && b.includes('"id":10'),
    );
    const events = parseSseEvents(buf);
    const names = events.map((e) => e.event);
    expect(names).toContain('cleared');
    expect(names.indexOf('cleared')).toBeLessThan(names.indexOf('log'));
    expect(buf).toContain('"message":"after clear"');
    await reader.cancel();
  });

  it('emits live cleared, status, and theme events', async () => {
    const v = view();
    const server = await startWebServer(v);
    servers.push(server);
    const res = await fetch(`${server.url}api/events?afterId=2`);
    const { reader } = await readSse(res, (b) => b.includes('event: theme'));

    v.set({ ...v.getWebSnapshot(), logs: [] });
    v.emit();
    const cleared = await readSseFrom(reader, (b) => b.includes('event: cleared'));
    expect(parseSseEvents(cleared.buf).some((e) => e.event === 'cleared')).toBe(
      true,
    );

    v.set({ ...v.getWebSnapshot(), status: 'PAUSED' });
    v.emit();
    const status = await readSseFrom(reader, (b) => b.includes('event: status'));
    expect(status.buf).toContain('"status":"PAUSED"');

    v.set({ ...v.getWebSnapshot(), theme: sakura });
    v.emit();
    const theme = await readSseFrom(reader, (b) =>
      b.includes('event: theme') && b.includes(sakura.primary),
    );
    expect(theme.buf).toContain(sakura.primary);
    await reader.cancel();
  });

  it('emits cleared on reconnect when afterId is ahead of the store', async () => {
    const v = view({ logs: [] });
    const server = await startWebServer(v);
    servers.push(server);
    const res = await fetch(`${server.url}api/events?afterId=2`);
    const { buf, reader } = await readSse(res, (b) => b.includes('event: theme'));
    expect(buf).toContain('event: cleared');
    await reader.cancel();
  });

  it('does not throw when a dropped SSE client is notified', async () => {
    const v = view();
    const server = await startWebServer(v);
    servers.push(server);
    const dead = await fetch(`${server.url}api/events`);
    const live = await fetch(`${server.url}api/events?afterId=2`);
    await dead.body!.getReader().cancel();
    await new Promise((r) => setTimeout(r, 30));
    v.set({ ...v.getWebSnapshot(), status: 'FAILED' });
    expect(() => v.emit()).not.toThrow();
    const { buf, reader } = await readSse(live, (b) =>
      b.includes('"status":"FAILED"'),
    );
    expect(buf).toContain('"status":"FAILED"');
    await reader.cancel();
  });

  it('stops reconnecting in page script after snapshot failure', async () => {
    const server = await startWebServer(view());
    servers.push(server);
    const html = await (await fetch(server.url)).text();
    expect(html).toContain('MAX_FAILURES = 5');
    expect(html).toContain("fetch('/api/snapshot')");
    expect(html).toContain('failCount = MAX_FAILURES');
    expect(html).toContain('applySnapshot(snap)');
  });
});

describe('SSE clear detection', () => {
  const a = { id: 1, timestamp: 1, level: 'info', message: 'a' };
  const b = { id: 2, timestamp: 2, level: 'info', message: 'b' };
  const c = { id: 10, timestamp: 10, level: 'info', message: 'c' };

  it('detects empty clear and min-id jump after clear-then-append', () => {
    expect(logsWereCleared([a, b], [])).toBe(true);
    expect(logsWereCleared([a, b], [c])).toBe(true);
    expect(logsWereCleared([a, b], [a, b, c])).toBe(false);
    expect(logsWereCleared([], [c])).toBe(false);
  });

  it('treats afterId with no earlier store ids as a clear', () => {
    expect(afterIdNeedsClear(2, [])).toBe(true);
    expect(afterIdNeedsClear(2, [c])).toBe(true);
    expect(afterIdNeedsClear(2, [a, b])).toBe(false);
    expect(afterIdNeedsClear(0, [])).toBe(false);
  });
});

async function readSse(
  res: Response,
  until: (buf: string) => boolean,
  ms = 2000,
): Promise<{ buf: string; reader: ReadableStreamDefaultReader<Uint8Array> }> {
  return readSseFrom(res.body!.getReader(), until, ms);
}

async function readSseFrom(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  until: (buf: string) => boolean,
  ms = 2000,
): Promise<{ buf: string; reader: ReadableStreamDefaultReader<Uint8Array> }> {
  const dec = new TextDecoder();
  let buf = '';
  const deadline = Date.now() + ms;
  while (!until(buf) && Date.now() < deadline) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
  }
  return { buf, reader };
}

function parseSseEvents(
  buf: string,
): { event: string; data: string; id?: string }[] {
  const events: { event: string; data: string; id?: string }[] = [];
  for (const block of buf.split('\n\n')) {
    if (!block.trim()) continue;
    let event = '';
    let data = '';
    let id: string | undefined;
    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) event = line.slice(7);
      else if (line.startsWith('data: ')) data = line.slice(6);
      else if (line.startsWith('id: ')) id = line.slice(4);
    }
    if (event) events.push({ event, data, id });
  }
  return events;
}

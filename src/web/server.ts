import http from 'node:http';
import type { LogEntry } from '../logs/types';
import { renderPageHtml } from './page';
import type {
  WebLogDto,
  WebServer,
  WebSessionView,
  WebSnapshot,
} from './types';

export type { WebServer } from './types';

export function toWebLog(entry: LogEntry): WebLogDto {
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    level: entry.level,
    message: entry.message,
  };
}

function maxLogId(logs: WebLogDto[]): number {
  return logs.reduce((max, log) => Math.max(max, log.id), 0);
}

/** True when TUI clear emptied the store, including clear-then-append in one notify. */
export function logsWereCleared(prev: WebLogDto[], next: WebLogDto[]): boolean {
  if (prev.length === 0) return false;
  if (next.length === 0) return true;
  const prevMax = maxLogId(prev);
  const nextMin = next.reduce(
    (min, log) => Math.min(min, log.id),
    Number.POSITIVE_INFINITY,
  );
  if (nextMin > prevMax) return true;
  const nextIds = new Set(next.map((log) => log.id));
  return prev.every((log) => !nextIds.has(log.id));
}

/** Reconnect afterId is ahead of (or past) a cleared store. */
export function afterIdNeedsClear(afterId: number, logs: WebLogDto[]): boolean {
  return afterId > 0 && !logs.some((log) => log.id <= afterId);
}

export async function startWebServer(
  view: WebSessionView,
  options: { host?: string; port?: number } = {},
): Promise<WebServer> {
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 0;
  const clients = new Set<http.ServerResponse>();

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${host}`);
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(renderPageHtml());
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/snapshot') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(view.getWebSnapshot()));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/events') {
      const lastEventIdHeader = req.headers['last-event-id'];
      const lastEventId = Array.isArray(lastEventIdHeader)
        ? lastEventIdHeader[0]
        : lastEventIdHeader;
      const afterHeader = Number.parseInt(lastEventId ?? '', 10);
      const afterQuery = Number.parseInt(
        url.searchParams.get('afterId') ?? '',
        10,
      );
      let afterId = 0;
      if (Number.isFinite(afterQuery)) afterId = afterQuery;
      else if (Number.isFinite(afterHeader)) afterId = afterHeader;

      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      });

      let dropped = false;
      let unsubscribe = (): void => {};

      const dropClient = () => {
        if (dropped) return;
        dropped = true;
        unsubscribe();
        clients.delete(res);
        if (!res.writableEnded && !res.destroyed) {
          try {
            res.end();
          } catch {
            // Client is already gone.
          }
        }
      };

      const send = (event: string, data: unknown, id?: number) => {
        if (dropped || res.destroyed || res.writableEnded) {
          dropClient();
          return;
        }
        try {
          if (id !== undefined) res.write(`id: ${id}\n`);
          res.write(`event: ${event}\n`);
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch {
          dropClient();
        }
      };

      const snap: WebSnapshot = view.getWebSnapshot();
      if (afterIdNeedsClear(afterId, snap.logs)) {
        send('cleared', {});
      }
      for (const log of view.logsSince(afterId)) {
        send('log', log, log.id);
      }
      send('status', { status: snap.status });
      send('theme', snap.theme);

      let prev = snap;
      unsubscribe = view.subscribe(() => {
        if (dropped) return;
        const next = view.getWebSnapshot();
        const cleared = logsWereCleared(prev.logs, next.logs);
        if (cleared) send('cleared', {});
        const prevMax = cleared ? 0 : maxLogId(prev.logs);
        for (const log of next.logs) {
          if (log.id > prevMax) send('log', log, log.id);
        }
        if (next.status !== prev.status)
          send('status', { status: next.status });
        if (JSON.stringify(next.theme) !== JSON.stringify(prev.theme)) {
          send('theme', next.theme);
        }
        prev = next;
      });

      clients.add(res);
      res.on('error', dropClient);
      req.on('close', dropClient);
      req.on('error', dropClient);
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('web ui failed: no address');
  }

  return {
    host,
    port: address.port,
    url: `http://${host}:${address.port}/`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        for (const client of clients) {
          try {
            client.end();
          } catch {
            // Client is already gone.
          }
        }
        clients.clear();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

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

      const send = (event: string, data: unknown, id?: number) => {
        if (id !== undefined) res.write(`id: ${id}\n`);
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      for (const log of view.logsSince(afterId)) {
        send('log', log, log.id);
      }
      const snap: WebSnapshot = view.getWebSnapshot();
      send('status', { status: snap.status });
      send('theme', snap.theme);

      let prev = snap;
      const unsubscribe = view.subscribe(() => {
        const next = view.getWebSnapshot();
        if (next.logs.length === 0 && prev.logs.length > 0) {
          send('cleared', {});
        }
        const prevMax = prev.logs.reduce((m, l) => Math.max(m, l.id), 0);
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
      req.on('close', () => {
        unsubscribe();
        clients.delete(res);
      });
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
        for (const client of clients) client.end();
        clients.clear();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

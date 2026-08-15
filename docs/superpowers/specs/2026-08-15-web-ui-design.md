# Companion Web UI

Date: 2026-08-15

## Goal

Give each Wed process instance an optional localhost log viewer in the browser. Press `w` to open it. The TUI stays in control of the child process. The page is a companion: logs, live follow, filter, level, search, and copy, styled with the active TUI theme in a JRPG / pixel-art menu look.

## Architecture

The TUI and child process stay as they are. A small Node `http` server is owned by `Session`.

- Bind `127.0.0.1` only. Port `0` so the OS assigns a free port.
- One server per `wed` instance; port is not shared.
- The page reads the same `LogStore` through `Session.subscribe()`. It does not start, stop, or restart the child.
- On `q` / shutdown, close the HTTP server. An open browser tab then fails to reconnect.

### Lifecycle

| Config `webUi` | On instance start | On `w` |
| --- | --- | --- |
| missing or `true` (default) | Listen, remember `http://127.0.0.1:<port>/` | Open that URL in the default browser |
| `false` | Do not listen | Start the server **for this run only**, open the URL. Do **not** write `webUi: true` to disk |

- macOS: `open <url>`. Linux: `xdg-open <url>`.
- If `w` is pressed while already listening, open the same URL again.
- Saving `webUi: false` in settings while a server is running does **not** stop it for this run. The next instance honors the saved flag.

## Config

```ts
export interface WedConfig {
  theme?: string;
  webUi?: boolean;
}
```

- `webUi` omitted means **true**.
- Persisted in `~/.config/wed/config.json` (or `$XDG_CONFIG_HOME/wed/config.json`) via existing `saveConfig` merge.

## Settings UI

Settings is no longer theme-only.

Rows, top to bottom:

1. `Web UI    ON` / `OFF` (preview of `webUi`)
2. Theme names (existing list, live preview as today)

- `↑` `↓` move the selection.
- On the Web UI row, `←` `→` or Space flips the preview. That does not close settings.
- `Enter` saves **both** `theme` and `webUi` (preview values) and closes.
- `Esc` reverts both previews and closes.
- `wed settings` uses the same panel.

Status bar hint includes `w web`. While listening, the header shows `http://127.0.0.1:<port>/`. After a failed start, the status bar shows `web ui failed: …`.

## HTTP API

Same origin as the page. No auth. No CORS for other origins.

| Route | Role |
| --- | --- |
| `GET /` | Single HTML+JS+CSS page |
| `GET /api/snapshot` | JSON: `command`, `args`, `status`, `theme`, `logs` |
| `GET /api/events` | SSE |

`logs` entries: `{ id, timestamp, level, message }` (not raw PTY bytes).

SSE named events:

- `log` — one new entry (same shape)
- `status` — process display status
- `cleared` — TUI `x` emptied the store; page clears its buffer
- `theme` — full `Theme` object after a TUI theme save

Reconnect: client sends `Last-Event-ID` or query `?afterId=<n>`. Server emits only entries with `id > afterId`, then continues live. Duplicate ids are ignored on the client.

## Web page

One self-contained page. No React/Vite. Vendor one small pixel font in the package.

**Chrome:** SNES-style menu windows (chunky double borders). Header window: command line, process status, existing mascot (`(•‿•)` etc.). Log window below.

**Theme:** snapshot `theme` maps onto CSS variables (`background`, `foreground`, `primary`, `secondary`, `info`, `warning`, `error`, `muted`, `debug`, `success`). `theme` SSE events update those variables live. No theme picker on the page.

**Logs:** timestamp, level, message; newest at the bottom.

**Follow:** on by default. A control pauses auto-scroll only. SSE still applies; resume is caught up. Independent of TUI `p`.

**Filter:** text box, client-side on `message`.

**Levels:** ALL / DEBUG / INFO / WARN / ERROR, client-side, same idea as TUI `1`–`5`.

**Search:** search box, client-side highlight, next/previous (like TUI `n` / `N`). Independent of filter.

**Copy:** a control copies **currently filtered** lines to the clipboard (`navigator.clipboard`). Native text selection still works. On failure, show a short error; do not clear logs.

**Not on the page:** restart, clear, inspect, theme picker, process control.

## Errors

- Listen or one-shot `w` start fails: TUI `web ui failed: <message>`; child keeps running.
- Browser open fails: server stays up; TUI shows the URL to copy.
- SSE drop: page reconnects with `afterId`.
- Shutdown with tab open: reconnect fails; page stops. No crash of Wed after exit.

## Files (units)

| Unit | Responsibility |
| --- | --- |
| `src/web/server.ts` | Listen, routes, SSE from Session, close |
| `src/web/page.ts` (or html template) | HTML/CSS/JS for the companion page |
| `src/web/openBrowser.ts` | `open` / `xdg-open` |
| `src/session/Session.ts` | Start/stop server from config; `w` one-shot |
| `src/app/commands.ts` | Map `w` → open web UI |
| `src/config/types.ts` | `webUi?: boolean` |
| `src/components/SettingsPanel.tsx` | Toggle row + themes |
| `src/components/Header.tsx` / `StatusBar.tsx` | Listening URL / `w web` / errors |

No new runtime npm dependencies.

## Testing

- Bind is `127.0.0.1`; port is ephemeral and free.
- `webUi: false` does not listen on `Session.start()`.
- `w` with `webUi: false` listens without writing config.
- Snapshot JSON shape; SSE `log` / `cleared` / `theme` / `status`.
- `loadConfig` treats missing `webUi` as enabled.
- Settings save persists `webUi`.
- Pixel/JRPG look is not screenshot-tested; HTML must apply theme CSS variables from snapshot.

## Out of scope

- Binding `0.0.0.0` or LAN access
- Auth tokens
- React, Vite, WebSockets, Fastify
- Process control, restart, clear, inspect from the browser
- Migrating old config (unknown keys already survive `loadRawConfig` merge)
- Changing the GitHub repo name

## Success

- `pnpm test`, `pnpm typecheck`, `pnpm lint` pass
- Default instance serves a page with live logs on a random localhost port
- `webUi: false` skips listen; `w` still opens a one-shot server
- `w` opens the system browser (or shows the URL if open fails)
- Page follow, filter, level, search, and copy work without affecting TUI pause
- Page colors match the active TUI theme and update when the theme is saved

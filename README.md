# Mayu

Terminal-first process runner and log inspector. Wrap any command in a fullscreen TUI to scroll, filter, search, and restart without changing the app you are running.

```bash
npm install -g mayu-cli
mayu pnpm run dev
```

Requires **Node.js 22+** on **macOS or Linux**. Windows is not supported in v1.

## Usage

```bash
mayu pnpm run dev
mayu node index.js
mayu --theme=sakura cargo run
mayu settings
```

If Node is too old:

```text
mayu requires Node.js 22 or newer.
Current version: v18.20.8
```

## Keyboard

| Key                                | Action                                                          |
| ---------------------------------- | --------------------------------------------------------------- |
| `q`                                | Quit and terminate the child                                    |
| `Ctrl+C`                           | First press terminates the child; second press force-exits Mayu |
| `p`                                | Pause / resume live log following                               |
| `c`                                | Clear logs                                                      |
| `f`                                | Filter text                                                     |
| `/`                                | Search (`n` / `N` next / previous)                              |
| `↑` `↓` `PgUp` `PgDn` `Home` `End` | Scroll                                                          |
| `1`–`5`                            | Level ALL / DEBUG / INFO / WARN / ERROR                         |
| `r`                                | Restart the process                                             |
| `s`                                | Open settings (theme picker)                                    |
| `Enter`                            | Inspect the selected error                                      |
| `Esc`                              | Close filter, search, inspector, or settings                    |

The TUI owns the keyboard. Child stdin is not forwarded.

## Themes

`cyberpunk` (default), `sakura`, `monochrome`, `gameboy`.

Press `s` while Mayu is running, or run `mayu settings`, to pick a theme. Enter saves it to `~/.config/mayu/config.json` (or `$XDG_CONFIG_HOME/mayu/config.json`). Esc cancels and restores the previous theme.

`--theme` overrides the saved theme for that run only.

```bash
mayu --theme=sakura pnpm run dev
```

## Development

```bash
pnpm install
pnpm test
pnpm build
node dist/index.js node tests/fixtures/logs.mjs
```

This repo uses pnpm 11. Native `node-pty` scripts must be allowed in `pnpm-workspace.yaml`:

```yaml
allowBuilds:
  node-pty: true
  esbuild: true
```

A `postinstall` script marks `spawn-helper` executable (pnpm can strip that bit from prebuilds).

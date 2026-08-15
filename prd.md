# Mayu --- Initial Product & Technical Specification

## 1. Overview

Mayu is a terminal-first developer tool for running arbitrary
commands inside an interactive TUI and providing a richer debugging/log
inspection experience than a normal terminal.

Primary usage:

```bash
mayu pnpm run dev
```

Other valid commands:

```bash
mayu node index.js
mayu npm run start
mayu docker compose up
mayu cargo run
```

The initial product is **not a traditional source-level debugger**. V1
is a process runner, PTY manager, log viewer, filter/search interface,
and process-control UI.

Future versions may add breakpoints, variables, call stacks, profiling,
and tracing.

---

## 2. Product Vision

The visual direction is:

**Ghost in the Shell + old JRPG menus + modern developer tooling.**

The interface should feel like a futuristic terminal command center with
restrained anime/pixel-art aesthetics.

Design principles:

- Functional first.
- High information density.
- Keyboard-first.
- Fast and responsive.
- Pixel/anime aesthetic without making logs difficult to read.
- Minimal unnecessary animation.
- Strong visual hierarchy.
- Themeable.
- No dependency between process/logging architecture and the UI
  implementation.

The attached reference image is the visual direction for the initial UI.

---

## 3. V1 Goals

V1 must provide:

- Execute arbitrary commands.
- Run the command through a PTY.
- Capture stdout/stderr/terminal output.
- Display live output in a fullscreen TUI.
- Scroll through logs.
- Pause/resume live log updates.
- Clear logs.
- Text filtering.
- Log-level filtering where levels can be detected.
- Search.
- Process status.
- Process restart.
- Process termination.
- Graceful Ctrl+C handling.
- Terminal resize handling.
- Bounded log storage.
- Exit status reporting.
- Attractive terminal UI.

V1 must work with:

```bash
mayu pnpm run dev
```

without requiring any changes to the application being debugged.

---

## 4. Non-Goals for V1

Do not implement:

- Breakpoints.
- Variable inspection.
- Call stack navigation.
- Step over/step into/step out.
- Node Inspector integration.
- DAP integration.
- Distributed tracing.
- OpenTelemetry integration.
- Remote debugging.
- IDE integration.
- Persistent log storage.
- Log shipping.
- Complex configuration management.

These can be future extensions.

---

## 5. Technology Stack

Use:

- Node.js 22+
- TypeScript
- React
- Ink
- node-pty
- pnpm
- Vitest
- ESLint
- Prettier

Recommended project tooling:

- tsup or equivalent bundler
- strict TypeScript configuration
- ESM

Do not use Bun as the runtime for V1.

---

## 6. Project Structure

Suggested structure:

```text
mayu/
├── src/
│   ├── cli/
│   │   └── index.ts
│   │
│   ├── process/
│   │   ├── ProcessManager.ts
│   │   ├── PtyProcess.ts
│   │   └── types.ts
│   │
│   ├── logs/
│   │   ├── LogStore.ts
│   │   ├── LogParser.ts
│   │   ├── LogFilter.ts
│   │   ├── RingBuffer.ts
│   │   └── types.ts
│   │
│   ├── app/
│   │   ├── App.tsx
│   │   ├── state.ts
│   │   └── commands.ts
│   │
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── ProcessPanel.tsx
│   │   ├── LogViewer.tsx
│   │   ├── LogLine.tsx
│   │   ├── FilterBar.tsx
│   │   ├── StatusBar.tsx
│   │   └── ErrorInspector.tsx
│   │
│   ├── themes/
│   │   ├── types.ts
│   │   ├── cyberpunk.ts
│   │   ├── sakura.ts
│   │   └── index.ts
│   │
│   └── index.tsx
│
├── tests/
│   ├── logs/
│   └── process/
│
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

The exact structure may change if implementation experience demonstrates
a cleaner separation.

---

## 7. Architecture

The application should have four major layers:

```text
CLI
 │
 ▼
Process Layer
 │
 │ PTY
 ▼
Log Layer
 │
 │ structured application state
 ▼
UI Layer
 │
 ▼
Ink / Terminal
```

Do not couple `node-pty` directly to React components.

The process layer emits events.

The log layer consumes those events and maintains the application data
model.

The UI subscribes to application state.

Conceptually:

```text
             ┌──────────────────┐
             │      CLI         │
             └────────┬─────────┘
                      │
                      ▼
             ┌──────────────────┐
             │ ProcessManager   │
             └────────┬─────────┘
                      │
                    PTY
                      │
                      ▼
             ┌──────────────────┐
             │   LogParser      │
             └────────┬─────────┘
                      │
                      ▼
             ┌──────────────────┐
             │    LogStore      │
             └────────┬─────────┘
                      │
                      ▼
             ┌──────────────────┐
             │  Filter/Search   │
             └────────┬─────────┘
                      │
                      ▼
             ┌──────────────────┐
             │   Ink / React    │
             └──────────────────┘
```

---

## 8. Process Execution

The CLI receives everything after the executable as the child command.

Example:

```bash
mayu pnpm run dev
```

The CLI should parse:

```text
command = pnpm
args    = ["run", "dev"]
```

Do not concatenate arguments into a shell command string.

Use `node-pty` to launch the process.

Conceptual API:

```ts
interface PtyProcess {
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(signal?: string): void;
  onData(listener: (data: string) => void): Disposable;
  onExit(listener: (event: ExitEvent) => void): Disposable;
}
```

The process should inherit:

- current working directory
- environment variables

Terminal dimensions should follow the parent terminal.

---

## 9. PTY Requirements

A real PTY is required rather than a simple stdout/stderr pipe.

Reason:

Many development tools behave differently depending on whether they are
attached to a TTY.

The PTY must support:

- stdin forwarding
- stdout/stderr capture
- ANSI escape sequences
- terminal colors
- cursor behavior
- interactive prompts
- resize events
- process termination

Do not strip ANSI sequences at the PTY boundary.

The original terminal stream may contain:

- colors
- cursor movement
- carriage returns
- spinners
- progress indicators
- terminal control sequences

---

## 10. Log Model

Use a normalized internal representation:

```ts
type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "unknown";

interface LogEntry {
  id: number;
  timestamp: number;
  level: LogLevel;
  message: string;
  raw: string;
}
```

The parser should be conservative.

Do not assume every line is structured.

Examples:

```text
INFO Server started
```

may become:

```ts
{
  level: "info",
  message: "Server started"
}
```

But arbitrary output should become:

```ts
{
  level: "unknown",
  message: "...",
}
```

The original `raw` value should be retained.

---

## 11. ANSI Handling

ANSI processing should be isolated.

The application must distinguish between:

1.  raw PTY data
2.  normalized log data
3.  rendered terminal output

Do not destroy ANSI information globally.

Future implementations may support ANSI-aware parsing and rendering.

For V1, prioritize reliable plain-text log extraction and preserve
unknown/raw output.

---

## 12. Log Store

The log store must be bounded.

Default:

```text
50,000 log entries
```

The limit should eventually become configurable.

Never allow unlimited log growth.

Use a ring-buffer-like structure rather than repeatedly calling
`Array.shift()` for high-volume workloads.

Expected behavior:

```text
new entry
    ↓
ring buffer
    ↓
when full → overwrite oldest entry
```

The UI should only render the visible portion.

---

## 13. Rendering Performance

Do not update React state for every PTY chunk.

Bad:

```text
PTY event
→ React state update
→ render
→ terminal
```

Preferred:

```text
PTY
 ↓
buffer
 ↓
batch updates
 ↓
update application state
 ↓
Ink render
```

The UI should have a controlled rendering cadence.

The process may produce thousands of log lines per second while the UI
renders at a manageable frame rate.

The rendering layer must not attempt to display millions of DOM-like
React elements.

Only visible log lines should be rendered.

---

## 14. Main UI

The initial UI should follow this structure:

```text
┌──────────────────────────────────────────────────────────────┐
│ mayu                                      ● RUNNING    │
│ > pnpm run dev                                 00:17:42      │
├──────────────────────────────────────────────────────────────┤
│ LOGS                                                         │
│ Filter: ____________________      Level: ALL                 │
├──────────────────────────────────────────────────────────────┤
│ 16:42:01  INFO   server   Server started on :3000            │
│ 16:42:02  INFO   db      Connected to PostgreSQL             │
│ 16:42:03  DEBUG  api     GET /api/users                      │
│ 16:42:03  DEBUG  api     GET /api/users 200                  │
│ 16:42:05  WARN   api     Slow request: 812ms                 │
│ 16:42:07  ERROR  db      Connection refused                  │
├──────────────────────────────────────────────────────────────┤
│ 127 logs   1 error     ↑↓ scroll    / search    p pause      │
└──────────────────────────────────────────────────────────────┘
```

The exact layout should adapt to terminal width.

---

## 15. Visual Design

Visual direction:

**Ghost in the Shell + old JRPG menus + modern developer tooling.**

Characteristics:

- dark background
- neon/cyberpunk accents
- thin technical borders
- monospaced typography
- Japanese-inspired decorative labels
- pixel-art mascot
- subtle scanline/glitch details
- restrained animations
- high information density

Avoid:

- excessive ASCII decoration
- giant logos
- excessive animations
- difficult-to-read colors
- unnecessary full-screen graphics
- anything that reduces log readability

The aesthetic should enhance the developer tool rather than dominate it.

---

## 16. Mascot

Include a small pixel-art/anime-inspired mascot in the header or status
area.

The mascot can change state:

```text
RUNNING
→ neutral/happy

ERROR
→ alert/angry

PAUSED
→ sleeping

PROCESS EXITED
→ inactive/glitched
```

Do not use copyrighted characters or directly reproduce existing anime
characters.

The visual reference should be treated as inspiration, not a requirement
to copy characters from Ghost in the Shell.

---

## 17. Themes

Themes should be data-driven.

Example:

```ts
interface Theme {
  name: string;
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  info: string;
  warning: string;
  error: string;
  muted: string;
}
```

Initial themes:

```text
cyberpunk
sakura
monochrome
gameboy
```

The default should be the cyberpunk theme.

Eventually:

```bash
mayu --theme=sakura pnpm run dev
```

---

## 18. Keyboard Controls

Initial controls:

```text
q / Ctrl+C     quit / terminate process
p              pause/resume live updates
c              clear logs
f              open filter
/              search
↑ / ↓          scroll
PageUp         page up
PageDown       page down
Home           oldest visible logs
End            newest logs
1              all levels
2              debug
3              info
4              warn
5              error
r              restart process
Enter          inspect selected error
Esc            close active mode
```

Keyboard behavior should be centralized rather than distributed
throughout components.

---

## 19. Filter System

Support:

### Level

```text
ALL
DEBUG
INFO
WARN
ERROR
```

### Text

```text
postgres
connection
/api/users
```

### Case-insensitive matching

Default.

### Regex

Future feature:

```text
/timeout|connection refused/i
```

The filter engine should be independent from the UI.

```ts
interface LogFilter {
  query?: string;
  level?: LogLevel;
  regex?: RegExp;
}
```

---

## 20. Search

Search should operate against the current log store.

The user should be able to:

```text
/
```

then type:

```text
postgres
```

and navigate:

```text
n       next match
N       previous match
Esc     exit search
```

Matches should be highlighted in the UI.

---

## 21. Error Inspector

When the user selects an error:

```text
Enter
```

show a detail view:

```text
╔══════════════════════════════════════════════════════════════╗
║ ERROR #42                                     16:42:07       ║
╠══════════════════════════════════════════════════════════════╣
║ Connection refused                                          ║
║                                                              ║
║ Error: connect ECONNREFUSED 127.0.0.1:5432                 ║
║                                                              ║
║ STACK TRACE                                                  ║
║                                                              ║
║ → connect       src/db/client.ts:42                         ║
║   initialize    src/app.ts:18                               ║
║   bootstrap     src/main.ts:7                               ║
║                                                              ║
║ PROCESS                                                      ║
║   pnpm run dev                                               ║
║   PID 18342                                                   ║
╚══════════════════════════════════════════════════════════════╝
```

V1 can detect stack traces heuristically.

Do not implement source-code inspection yet.

---

## 22. Process Panel

Display:

```text
PROCESS
pnpm run dev

PID      18342
STATUS   RUNNING
UPTIME   00:17:42
CPU      4.2%
MEM      182 MB
```

CPU and memory metrics may initially be omitted if cross-platform
implementation becomes distracting.

Process correctness is more important than metrics.

---

## 23. Process Lifecycle

States:

```ts
type ProcessStatus =
  | "starting"
  | "running"
  | "paused"
  | "exited"
  | "failed"
  | "terminating";
```

Handle:

- normal exit
- non-zero exit
- signal termination
- spawn failure
- PTY failure

Example:

```text
PROCESS EXITED

Exit code: 1

[r] Restart
[q] Quit
```

---

## 24. Ctrl+C Behavior

First `Ctrl+C`:

```text
terminate child process
```

Second `Ctrl+C`:

```text
force exit mayu
```

Avoid accidentally killing only the TUI while leaving the child process
alive.

Process cleanup must be guaranteed on:

- normal exit
- Ctrl+C
- terminal close
- uncaught error
- process spawn failure

---

## 25. Terminal Resize

Listen for parent terminal resize.

When dimensions change:

```text
process.resize(cols, rows)
```

and update the Ink layout.

The application must remain usable at:

```text
80x24
```

and scale up naturally to large terminals.

---

## 26. Distribution

Publish to npm:

```bash
npm install -g mayu
```

Requirements:

```json
{
  "engines": {
    "node": ">=22"
  }
}
```

The CLI should explicitly reject unsupported Node versions with a clear
error.

Example:

```text
mayu requires Node.js 22 or newer.
Current version: v18.20.8
```

Standalone binaries can be added later.

---

## 27. Testing

Unit tests:

```text
LogParser
LogFilter
RingBuffer
Process lifecycle
Command argument parsing
```

Integration tests:

```text
spawn node test-fixture
capture output
filter output
terminate process
verify exit code
```

UI tests should focus on state transitions rather than pixel-perfect
terminal snapshots initially.

Create test fixtures that produce:

- normal logs
- errors
- high-volume logs
- ANSI output
- delayed output
- process exit
- non-zero exit
- interactive input

---

## 28. Development Milestones

### Milestone 1 --- CLI

```text
mayu node test.js
```

- argument parsing
- process spawn
- process cleanup

### Milestone 2 --- PTY

- node-pty
- stdin
- output
- resize
- signals

### Milestone 3 --- Basic Ink UI

- fullscreen interface
- header
- live output
- status bar
- quit

### Milestone 4 --- Log Store

- LogEntry
- parser
- bounded ring buffer
- timestamps

### Milestone 5 --- Navigation

- scrolling
- pause
- clear
- restart

### Milestone 6 --- Filtering

- level filtering
- text filtering
- search

### Milestone 7 --- Visual Design

- cyberpunk theme
- borders
- colors
- mascot
- status animations

### Milestone 8 --- Error Inspection

- error selection
- stack trace extraction
- detail view

### Milestone 9 --- Packaging

- npm package
- Node version validation
- CI
- release automation

---

## 29. Future Architecture

The architecture should leave room for:

```text
mayu
├── Process
├── Logs
├── Metrics
├── Errors
├── Traces
└── Debugger
```

Future debugger integration could use:

```text
Node Inspector Protocol
```

or:

```text
Debug Adapter Protocol (DAP)
```

Do not implement either in V1.

Future observability support could integrate:

```text
OpenTelemetry
SigNoz
Loki
```

but these should remain optional integrations.

---

## 30. Engineering Constraints

Priorities, in order:

1.  Process correctness.
2.  No orphaned child processes.
3.  Terminal correctness.
4.  UI responsiveness.
5.  Bounded memory usage.
6.  Clean architecture.
7.  Cross-platform behavior.
8.  Visual polish.

Avoid premature abstraction.

Avoid a global mutable singleton.

Avoid coupling domain logic to React/Ink.

Avoid storing unbounded logs.

Avoid processing every PTY chunk through React state.

Avoid implementing a full debugger in V1.

---

## 31. Definition of Done for V1

This command:

```bash
mayu pnpm run dev
```

must:

1.  Start `pnpm run dev` inside a PTY.
2.  Display a fullscreen TUI.
3.  Show live output.
4.  Preserve usable terminal behavior.
5.  Allow scrolling.
6.  Allow pausing.
7.  Allow filtering.
8.  Allow searching.
9.  Allow clearing logs.
10. Allow restarting the process.
11. Correctly terminate the child process.
12. Display process status.
13. Handle terminal resize.
14. Maintain bounded memory usage.
15. Work on macOS, Linux, and Windows where supported by dependencies.
16. Be installable through npm.
17. Reject unsupported Node versions clearly.

The first implementation should prioritize a solid process/PTY/logging
core and a functional TUI. The anime/pixel-art styling should be
implemented after the underlying interaction model is stable.

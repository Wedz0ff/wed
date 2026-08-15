import type { Action } from '../app/commands';
import { runCommand } from '../app/slashCommands';
import { createUiState, type DisplayStatus, type UiState } from '../app/state';
import { LineAssembler } from '../logs/LineAssembler';
import { filterLogs, findMatchIndexes } from '../logs/LogFilter';
import { LogStore } from '../logs/LogStore';
import { extractStack, type ExtractedStack } from '../logs/StackTrace';
import type { LogEntry } from '../logs/types';
import { ProcessManager } from '../process/ProcessManager';
import type { ProcessStatus } from '../process/types';
import {
  copyText as defaultCopyText,
  formatLogsForClipboard,
} from '../clipboard/copyText';
import { isWebUiEnabled } from '../config/load';
import { saveConfig } from '../config/save';
import { getTheme, listThemes, type Theme } from '../themes/index';
import { openBrowser } from '../web/openBrowser';
import { startWebServer, toWebLog, type WebServer } from '../web/server';
import type { WebLogDto, WebSnapshot } from '../web/types';

const BATCH_MS = 50;
const CHROME_ROWS = 9;

export interface SessionOptions {
  command: string;
  args: string[];
  themeName?: string;
  configPath?: string;
  copyText?: (text: string) => Promise<void>;
  cols?: number;
  rows?: number;
  cwd?: string;
  logCapacity?: number;
  webUi?: boolean;
  openBrowser?: (url: string) => Promise<void>;
}

export interface Snapshot {
  command: string;
  args: string[];
  pid?: number;
  status: ProcessStatus;
  displayStatus: DisplayStatus;
  startedAt?: number;
  exitCode?: number;
  lastError?: string;
  ui: UiState;
  visibleLogs: LogEntry[];
  filteredCount: number;
  totalCount: number;
  errorCount: number;
  searchMatches: number;
  theme: Theme;
  exitRequested: boolean;
  forceExit: boolean;
  inspector: ExtractedStack | undefined;
  webUrl: string | undefined;
  webError: string | undefined;
}

export class Session {
  readonly logs: LogStore;
  readonly process = new ProcessManager();
  readonly assembler = new LineAssembler();
  ui: UiState;
  exitRequested = false;
  forceExit = false;
  webUrl: string | undefined;
  webError: string | undefined;

  private readonly command: string;
  private readonly args: string[];
  private readonly cwd: string;
  private readonly configPath: string | undefined;
  private readonly copyText: (text: string) => Promise<void>;
  private webUiPref: boolean | undefined;
  private readonly openBrowserFn:
    | ((url: string) => Promise<void>)
    | undefined;
  private webServer: WebServer | undefined;
  private webListen: Promise<void> | undefined;
  private cols: number;
  private rows: number;
  private ctrlCCount = 0;
  private dirty = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly listeners = new Set<() => void>();
  private readonly onSignal = () => {
    void this.shutdown();
  };

  constructor(options: SessionOptions) {
    this.command = options.command;
    this.args = options.args;
    this.cwd = options.cwd ?? process.cwd();
    this.configPath = options.configPath;
    this.copyText = options.copyText ?? defaultCopyText;
    this.webUiPref = options.webUi;
    this.openBrowserFn = options.openBrowser;
    this.cols = options.cols ?? process.stdout.columns ?? 80;
    this.rows = options.rows ?? process.stdout.rows ?? 24;
    this.logs = new LogStore(options.logCapacity);
    this.ui = createUiState(
      options.themeName ?? 'cyberpunk',
      Math.max(3, this.rows - CHROME_ROWS),
    );

    this.process.onData = (data) => {
      this.ingest(data);
    };
    this.process.onStatus = () => {
      this.notifySoon();
    };
  }

  start(): void {
    this.registerCleanup();
    this.process.start({
      command: this.command,
      args: this.args,
      cwd: this.cwd,
      cols: this.cols,
      rows: this.rows,
    });
    if (isWebUiEnabled({ webUi: this.webUiPref })) {
      void this.ensureWebServer().then(() => this.notifySoon());
    }
  }

  async ensureWebServer(): Promise<void> {
    if (this.webServer) {
      return;
    }
    if (!this.webListen) {
      this.webListen = this.listenWebServer();
    }
    await this.webListen;
  }

  async openWebUi(): Promise<void> {
    await this.ensureWebServer();
    this.notifySoon();
    if (!this.webUrl) {
      return;
    }
    try {
      await (this.openBrowserFn ?? openBrowser)(this.webUrl);
      this.webError = undefined;
    } catch {
      this.webError = `web ui: ${this.webUrl}`;
    }
    this.notifySoon();
  }

  getWebSnapshot(): WebSnapshot {
    return {
      command: this.command,
      args: this.args,
      status: this.displayStatus(),
      theme: getTheme(this.ui.themeName),
      logs: this.logs.toArray().map(toWebLog),
    };
  }

  logsSince(afterId: number): WebLogDto[] {
    return this.logs
      .toArray()
      .filter((e) => e.id > afterId)
      .map(toWebLog);
  }

  ingest(data: string): void {
    const lines = this.assembler.push(data);
    for (const line of lines) {
      this.logs.appendRaw(line);
    }
    if (this.ui.follow) {
      this.pinToEnd();
    }
    this.notifySoon();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispatch(action: Action): void {
    if (action.type !== 'copy') {
      this.ui.copyStatus = undefined;
    }
    switch (action.type) {
      case 'quit':
        void this.requestExit();
        break;
      case 'ctrlC':
        void this.handleCtrlC();
        break;
      case 'toggleFollow':
        this.ui.follow = !this.ui.follow;
        if (this.ui.follow) this.pinToEnd();
        break;
      case 'clear':
        this.logs.clear();
        this.ui.selectedIndex = 0;
        this.ui.scrollOffset = 0;
        break;
      case 'copy':
        void this.copyFiltered();
        break;
      case 'openFilter':
        this.ui.mode = 'filter';
        break;
      case 'openSearch':
        this.ui.mode = 'search';
        this.ui.searchIndex = 0;
        this.jumpToSearch(0);
        break;
      case 'openSettings':
        this.openSettings();
        break;
      case 'openCommand':
        this.ui.mode = 'command';
        this.ui.commandQuery = '';
        this.ui.commandError = undefined;
        break;
      case 'submitCommand':
        this.submitCommand();
        break;
      case 'openWebUi':
        void this.openWebUi();
        break;
      case 'toggleWebUiSetting':
        this.toggleWebUiSetting();
        break;
      case 'confirmSettings':
        this.confirmSettings();
        break;
      case 'escape':
        if (this.ui.mode === 'settings') {
          this.ui.themeName = this.ui.settingsOpenedTheme;
          this.ui.settingsWebUi = this.ui.settingsOpenedWebUi;
          this.ui.settingsError = undefined;
        }
        if (this.ui.mode === 'command') {
          this.ui.commandQuery = '';
          this.ui.commandError = undefined;
        }
        this.ui.mode = 'normal';
        break;
      case 'scroll':
        if (this.ui.mode === 'settings') {
          this.moveSettingsSelection(action.delta);
          break;
        }
        this.ui.follow = false;
        this.moveSelection(action.delta);
        break;
      case 'page':
        this.ui.follow = false;
        this.moveSelection(action.direction * this.ui.visibleRowCount);
        break;
      case 'home':
        this.ui.follow = false;
        this.ui.selectedIndex = 0;
        this.ui.scrollOffset = 0;
        break;
      case 'end':
        this.ui.follow = true;
        this.pinToEnd();
        break;
      case 'setLevel':
        this.ui.filterLevel = action.level;
        this.clampSelection();
        break;
      case 'restart':
        void this.restart();
        break;
      case 'inspect':
        this.openInspector();
        break;
      case 'input':
        this.appendQuery(action.text);
        break;
      case 'backspace':
        this.deleteQueryChar();
        break;
      case 'searchNext':
        this.jumpToSearch(1);
        break;
      case 'searchPrev':
        this.jumpToSearch(-1);
        break;
    }
    this.notifySoon();
  }

  resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.ui.visibleRowCount = Math.max(3, rows - CHROME_ROWS);
    this.process.resize(cols, rows);
    this.clampSelection();
    this.notifySoon();
  }

  getSnapshot(): Snapshot {
    const filtered = this.filtered();
    const matches = findMatchIndexes(filtered, this.ui.searchQuery);
    const offset = this.ui.follow
      ? Math.max(0, filtered.length - this.ui.visibleRowCount)
      : this.ui.scrollOffset;
    const visibleLogs = filtered.slice(
      offset,
      offset + this.ui.visibleRowCount,
    );
    const errorCount = this.logs
      .toArray()
      .reduce((count, entry) => count + (entry.level === 'error' ? 1 : 0), 0);

    return {
      command: this.command,
      args: this.args,
      pid: this.process.pid,
      status: this.process.status,
      displayStatus: this.displayStatus(),
      startedAt: this.process.startedAt,
      exitCode: this.process.exitCode,
      lastError: this.process.lastError,
      ui: { ...this.ui, scrollOffset: offset },
      visibleLogs,
      filteredCount: filtered.length,
      totalCount: this.logs.length,
      errorCount,
      searchMatches: matches.length,
      theme: getTheme(this.ui.themeName),
      exitRequested: this.exitRequested,
      forceExit: this.forceExit,
      inspector:
        this.ui.mode === 'inspect'
          ? extractStack(filtered, this.ui.selectedIndex)
          : undefined,
      webUrl: this.webUrl,
      webError: this.webError,
    };
  }

  async shutdown(): Promise<void> {
    this.unregisterCleanup();
    this.flushPending();
    const leftover = this.assembler.flush();
    if (leftover) {
      this.logs.appendRaw(leftover);
    }
    await this.process.terminate();
    if (this.webListen) {
      await this.webListen;
    }
    await this.webServer?.close();
    this.webServer = undefined;
    this.webUrl = undefined;
    this.webListen = undefined;
    this.notifyNow();
  }

  private async listenWebServer(): Promise<void> {
    try {
      this.webServer = await startWebServer(this);
      this.webUrl = this.webServer.url;
      this.webError = undefined;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.webError = `web ui failed: ${message}`;
      this.webListen = undefined;
    }
  }

  private async restart(): Promise<void> {
    await this.process.restart();
    this.logs.appendSynthetic('── process restarted ──');
    this.ctrlCCount = 0;
    this.notifySoon();
  }

  private async handleCtrlC(): Promise<void> {
    this.ctrlCCount += 1;
    if (this.ctrlCCount === 1) {
      await this.process.terminate('SIGTERM');
      return;
    }
    this.forceExit = true;
    this.exitRequested = true;
    await this.process.terminate('SIGKILL');
    this.notifyNow();
  }

  private async requestExit(): Promise<void> {
    this.exitRequested = true;
    await this.shutdown();
    this.notifyNow();
  }

  private filtered(): LogEntry[] {
    return filterLogs(this.logs.toArray(), {
      query: this.ui.filterQuery,
      level: this.ui.filterLevel,
    });
  }

  private pinToEnd(): void {
    const count = this.filtered().length;
    this.ui.selectedIndex = Math.max(0, count - 1);
    this.ui.scrollOffset = Math.max(0, count - this.ui.visibleRowCount);
  }

  private moveSelection(delta: number): void {
    const count = this.filtered().length;
    this.ui.selectedIndex = clamp(
      this.ui.selectedIndex + delta,
      0,
      Math.max(0, count - 1),
    );
    this.ensureVisible();
  }

  private clampSelection(): void {
    const count = this.filtered().length;
    this.ui.selectedIndex = clamp(
      this.ui.selectedIndex,
      0,
      Math.max(0, count - 1),
    );
    this.ensureVisible();
  }

  private ensureVisible(): void {
    const { selectedIndex, visibleRowCount } = this.ui;
    if (selectedIndex < this.ui.scrollOffset) {
      this.ui.scrollOffset = selectedIndex;
    } else if (selectedIndex >= this.ui.scrollOffset + visibleRowCount) {
      this.ui.scrollOffset = selectedIndex - visibleRowCount + 1;
    }
    this.ui.scrollOffset = Math.max(0, this.ui.scrollOffset);
  }

  private appendQuery(text: string): void {
    if (this.ui.mode === 'filter') {
      this.ui.filterQuery += text;
      this.clampSelection();
    }
    if (this.ui.mode === 'search') {
      this.ui.searchQuery += text;
      this.ui.searchIndex = 0;
      this.jumpToSearch(0);
    }
    if (this.ui.mode === 'command') {
      this.ui.commandQuery += text;
      this.ui.commandError = undefined;
    }
  }

  private deleteQueryChar(): void {
    if (this.ui.mode === 'filter') {
      this.ui.filterQuery = this.ui.filterQuery.slice(0, -1);
      this.clampSelection();
    }
    if (this.ui.mode === 'search') {
      this.ui.searchQuery = this.ui.searchQuery.slice(0, -1);
      this.ui.searchIndex = 0;
      this.jumpToSearch(0);
    }
    if (this.ui.mode === 'command') {
      this.ui.commandQuery = this.ui.commandQuery.slice(0, -1);
      this.ui.commandError = undefined;
    }
  }

  private jumpToSearch(delta: number): void {
    const matches = findMatchIndexes(this.filtered(), this.ui.searchQuery);
    if (matches.length === 0) {
      return;
    }
    const next =
      (this.ui.searchIndex + delta + matches.length * 10) % matches.length;
    this.ui.searchIndex = next;
    const target = matches[next];
    if (target === undefined) {
      return;
    }
    this.ui.follow = false;
    this.ui.selectedIndex = target;
    this.ensureVisible();
  }

  private async copyFiltered(): Promise<void> {
    const entries = this.filtered();
    try {
      await this.copyText(formatLogsForClipboard(entries));
      this.ui.copyStatus = `copied ${entries.length} lines`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.ui.copyStatus = `copy failed: ${message}`;
    }
    this.notifySoon();
  }

  private submitCommand(): void {
    const result = runCommand(this.ui.commandQuery);
    if (result.type === 'cancel') {
      this.ui.mode = 'normal';
      this.ui.commandQuery = '';
      this.ui.commandError = undefined;
      return;
    }
    if (result.type === 'error') {
      this.ui.commandError = result.message;
      return;
    }
    this.ui.commandQuery = '';
    this.ui.commandError = undefined;
    this.openSettings();
  }

  private openSettings(): void {
    const themes = listThemes();
    const index = themes.indexOf(this.ui.themeName);
    this.ui.mode = 'settings';
    this.ui.settingsIndex = (index >= 0 ? index : 0) + 1;
    this.ui.settingsOpenedTheme = this.ui.themeName;
    this.ui.settingsWebUi = isWebUiEnabled({ webUi: this.webUiPref });
    this.ui.settingsOpenedWebUi = this.ui.settingsWebUi;
    this.ui.settingsError = undefined;
    this.ui.themeName = themes[this.ui.settingsIndex - 1] ?? this.ui.themeName;
  }

  private confirmSettings(): void {
    try {
      saveConfig(
        { theme: this.ui.themeName, webUi: this.ui.settingsWebUi },
        this.configPath,
      );
      this.webUiPref = this.ui.settingsWebUi;
      this.ui.mode = 'normal';
      this.ui.settingsError = undefined;
    } catch (error) {
      this.ui.settingsError =
        error instanceof Error ? error.message : String(error);
    }
  }

  private moveSettingsSelection(delta: number): void {
    const themes = listThemes();
    this.ui.settingsIndex = clamp(
      this.ui.settingsIndex + delta,
      0,
      themes.length,
    );
    if (this.ui.settingsIndex !== 0) {
      this.ui.themeName = themes[this.ui.settingsIndex - 1] ?? this.ui.themeName;
    }
    this.ui.settingsError = undefined;
  }

  private toggleWebUiSetting(): void {
    if (this.ui.mode === 'settings' && this.ui.settingsIndex === 0) {
      this.ui.settingsWebUi = !this.ui.settingsWebUi;
    }
  }

  private openInspector(): void {
    const selected = this.filtered()[this.ui.selectedIndex];
    if (!selected || selected.level !== 'error') {
      return;
    }
    this.ui.mode = 'inspect';
  }

  private displayStatus(): DisplayStatus {
    if (this.process.status === 'running' && !this.ui.follow) {
      return 'PAUSED';
    }
    switch (this.process.status) {
      case 'starting':
        return 'STARTING';
      case 'running':
        return 'RUNNING';
      case 'terminating':
        return 'TERMINATING';
      case 'failed':
        return 'FAILED';
      default:
        return 'EXITED';
    }
  }

  private registerCleanup(): void {
    if (process.env.VITEST) {
      return;
    }
    if (this.cleanupRegistered) {
      return;
    }
    this.cleanupRegistered = true;
    process.on('SIGINT', this.onSignal);
    process.on('SIGTERM', this.onSignal);
    process.on('beforeExit', this.onSignal);
    process.on('uncaughtException', this.onSignal);
  }

  private cleanupRegistered = false;

  private unregisterCleanup(): void {
    if (!this.cleanupRegistered) {
      return;
    }
    this.cleanupRegistered = false;
    process.off('SIGINT', this.onSignal);
    process.off('SIGTERM', this.onSignal);
    process.off('beforeExit', this.onSignal);
    process.off('uncaughtException', this.onSignal);
  }

  private notifySoon(): void {
    this.dirty = true;
    if (this.timer) {
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.notifyNow();
    }, BATCH_MS);
  }

  private notifyNow(): void {
    this.dirty = false;
    for (const listener of [...this.listeners]) {
      try {
        listener();
      } catch {
        // A dead SSE client must not take down the TUI.
      }
    }
  }

  private flushPending(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    if (this.dirty) {
      this.notifyNow();
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

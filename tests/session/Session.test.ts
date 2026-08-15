import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/load';
import { Session } from '../../src/session/Session';
import { listThemes } from '../../src/themes/index';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Session', () => {
  it('parses ingested PTY-like chunks into bounded log entries', () => {
    const session = new Session({
      command: 'node',
      args: ['app.js'],
      logCapacity: 3,
      rows: 24,
      cols: 80,
    });
    session.ingest('INFO one\nINFO two\nINFO three\nINFO four\n');
    const snap = session.getSnapshot();
    expect(snap.totalCount).toBe(3);
    expect(snap.visibleLogs.map((e) => e.message)).toEqual([
      'two',
      'three',
      'four',
    ]);
  });

  it('pauses follow and keeps older lines in view', () => {
    const session = new Session({
      command: 'node',
      args: [],
      rows: 24,
      cols: 80,
    });
    session.ingest('INFO a\nINFO b\n');
    session.dispatch({ type: 'toggleFollow' });
    session.ingest('INFO c\n');
    expect(session.ui.follow).toBe(false);
    expect(session.getSnapshot().ui.follow).toBe(false);
  });

  it('filters by text and searches within the filtered view', () => {
    const session = new Session({ command: 'node', args: [] });
    session.ingest(
      'INFO postgres ready\nINFO redis ready\nERROR postgres down\n',
    );
    session.dispatch({ type: 'openFilter' });
    session.dispatch({ type: 'input', text: 'postgres' });
    session.dispatch({ type: 'escape' });
    expect(session.getSnapshot().filteredCount).toBe(2);

    session.dispatch({ type: 'openSearch' });
    session.dispatch({ type: 'input', text: 'down' });
    const snap = session.getSnapshot();
    expect(snap.searchMatches).toBe(1);
    expect(
      snap.visibleLogs[snap.ui.selectedIndex - snap.ui.scrollOffset]?.message,
    ).toContain('down');
  });

  it('clears logs', () => {
    const session = new Session({ command: 'node', args: [] });
    session.ingest('INFO hi\n');
    session.dispatch({ type: 'clear' });
    expect(session.getSnapshot().totalCount).toBe(0);
  });

  it('opens the inspector only for error lines', () => {
    const session = new Session({ command: 'node', args: [] });
    session.ingest('INFO ok\nERROR boom\n');
    session.dispatch({ type: 'end' });
    session.dispatch({ type: 'inspect' });
    expect(session.ui.mode).toBe('inspect');
    expect(session.getSnapshot().inspector?.title).toContain('boom');
  });

  it('batches subscriber notifications instead of flushing per chunk', async () => {
    const session = new Session({ command: 'node', args: [] });
    let ticks = 0;
    session.subscribe(() => {
      ticks += 1;
    });
    session.ingest('INFO a\n');
    session.ingest('INFO b\n');
    session.ingest('INFO c\n');
    expect(ticks).toBe(0);
    await wait(80);
    expect(ticks).toBe(1);
  });

  it('opens settings from the !settings command', () => {
    const session = new Session({ command: 'node', args: [] });
    session.dispatch({ type: 'openCommand' });
    expect(session.ui.mode).toBe('command');
    session.dispatch({ type: 'input', text: 'set' });
    session.dispatch({ type: 'input', text: 'tings' });
    session.dispatch({ type: 'submitCommand' });
    expect(session.ui.mode).toBe('settings');
    expect(session.ui.commandQuery).toBe('');
    expect(session.ui.commandError).toBeUndefined();
  });

  it('keeps the command prompt open on an unknown command', () => {
    const session = new Session({ command: 'node', args: [] });
    session.dispatch({ type: 'openCommand' });
    session.dispatch({ type: 'input', text: 'theme' });
    session.dispatch({ type: 'submitCommand' });
    expect(session.ui.mode).toBe('command');
    expect(session.ui.commandError).toBe('unknown command: theme');
    session.dispatch({ type: 'input', text: 's' });
    expect(session.ui.commandError).toBeUndefined();
  });

  it('cancels the command prompt on escape or empty submit', () => {
    const session = new Session({ command: 'node', args: [] });
    session.dispatch({ type: 'openCommand' });
    session.dispatch({ type: 'input', text: 'set' });
    session.dispatch({ type: 'escape' });
    expect(session.ui.mode).toBe('normal');
    expect(session.ui.commandQuery).toBe('');

    session.dispatch({ type: 'openCommand' });
    session.dispatch({ type: 'submitCommand' });
    expect(session.ui.mode).toBe('normal');
  });

  it('opens settings and live-previews the highlighted theme', () => {
    const session = new Session({
      command: 'node',
      args: [],
      themeName: 'cyberpunk',
    });
    session.dispatch({ type: 'openSettings' });
    expect(session.ui.mode).toBe('settings');
    expect(session.ui.themeName).toBe('cyberpunk');

    session.dispatch({ type: 'scroll', delta: 1 });
    const themes = listThemes();
    expect(session.ui.themeName).toBe(themes[1]);
    expect(session.getSnapshot().theme.name).toBe(themes[1]);
  });

  it('reverts the previewed theme when settings is cancelled', () => {
    const session = new Session({
      command: 'node',
      args: [],
      themeName: 'sakura',
    });
    session.dispatch({ type: 'openSettings' });
    session.dispatch({ type: 'scroll', delta: 1 });
    expect(session.ui.themeName).not.toBe('sakura');
    session.dispatch({ type: 'escape' });
    expect(session.ui.mode).toBe('normal');
    expect(session.ui.themeName).toBe('sakura');
  });

  it('persists the selected theme on confirm', () => {
    const file = path.join(
      mkdtempSync(path.join(tmpdir(), 'wed-session-')),
      'config.json',
    );
    const session = new Session({
      command: 'node',
      args: [],
      themeName: 'cyberpunk',
      configPath: file,
    });
    session.dispatch({ type: 'openSettings' });
    session.dispatch({ type: 'scroll', delta: 1 });
    const chosen = session.ui.themeName;
    session.dispatch({ type: 'confirmSettings' });
    expect(session.ui.mode).toBe('normal');
    expect(session.ui.themeName).toBe(chosen);
    expect(loadConfig(file)).toEqual({ theme: chosen, webUi: true });
    expect(readFileSync(file, 'utf8').endsWith('\n')).toBe(true);
  });

  it('saves webUi preview with the theme', () => {
    const file = path.join(
      mkdtempSync(path.join(tmpdir(), 'wed-session-')),
      'config.json',
    );
    const session = new Session({
      command: 'node',
      args: [],
      themeName: 'cyberpunk',
      configPath: file,
      webUi: true,
    });
    session.dispatch({ type: 'openSettings' });
    while (session.ui.settingsIndex > 0) {
      session.dispatch({ type: 'scroll', delta: -1 });
    }
    session.dispatch({ type: 'toggleWebUiSetting' });
    session.dispatch({ type: 'confirmSettings' });
    expect(loadConfig(file)).toMatchObject({
      theme: 'cyberpunk',
      webUi: false,
    });
  });

  it('copies the filtered view without changing follow or selection', async () => {
    let captured = '';
    const session = new Session({
      command: 'node',
      args: [],
      copyText: async (text) => {
        captured = text;
      },
    });
    session.ingest(
      'INFO postgres ready\nINFO redis ready\nERROR postgres down\n',
    );
    session.dispatch({ type: 'openFilter' });
    session.dispatch({ type: 'input', text: 'postgres' });
    session.dispatch({ type: 'escape' });
    const selected = session.ui.selectedIndex;
    const follow = session.ui.follow;
    session.dispatch({ type: 'copy' });
    await wait(20);
    expect(captured).toBe('INFO postgres ready\nERROR postgres down\n');
    expect(session.ui.copyStatus).toBe('copied 2 lines');
    expect(session.ui.follow).toBe(follow);
    expect(session.ui.selectedIndex).toBe(selected);
  });

  it('reports an empty copy and clears the status on the next action', async () => {
    let captured: string | undefined;
    const session = new Session({
      command: 'node',
      args: [],
      copyText: async (text) => {
        captured = text;
      },
    });
    session.dispatch({ type: 'copy' });
    await wait(20);
    expect(captured).toBe('');
    expect(session.ui.copyStatus).toBe('copied 0 lines');
    session.dispatch({ type: 'toggleFollow' });
    expect(session.ui.copyStatus).toBeUndefined();
  });

  it('surfaces a copy failure without crashing', async () => {
    const session = new Session({
      command: 'node',
      args: [],
      copyText: async () => {
        throw new Error('no clipboard');
      },
    });
    session.ingest('INFO hi\n');
    session.dispatch({ type: 'copy' });
    await wait(20);
    expect(session.ui.copyStatus).toBe('copy failed: no clipboard');
    expect(session.getSnapshot().totalCount).toBe(1);
  });

  it('stays in settings and surfaces an error when persist fails', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'wed-session-'));
    const session = new Session({
      command: 'node',
      args: [],
      themeName: 'cyberpunk',
      configPath: dir,
    });
    session.dispatch({ type: 'openSettings' });
    session.dispatch({ type: 'confirmSettings' });
    expect(session.ui.mode).toBe('settings');
    expect(session.ui.settingsError).toBeTruthy();
  });
});

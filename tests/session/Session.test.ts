import { describe, expect, it } from 'vitest';
import { Session } from '../../src/session/Session';

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
    session.ingest('INFO postgres ready\nINFO redis ready\nERROR postgres down\n');
    session.dispatch({ type: 'openFilter' });
    session.dispatch({ type: 'input', text: 'postgres' });
    session.dispatch({ type: 'escape' });
    expect(session.getSnapshot().filteredCount).toBe(2);

    session.dispatch({ type: 'openSearch' });
    session.dispatch({ type: 'input', text: 'down' });
    const snap = session.getSnapshot();
    expect(snap.searchMatches).toBe(1);
    expect(snap.visibleLogs[snap.ui.selectedIndex - snap.ui.scrollOffset]?.message).toContain(
      'down',
    );
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
});

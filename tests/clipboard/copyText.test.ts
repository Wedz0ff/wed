import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  clipboardCommands,
  copyText,
  formatLogsForClipboard,
} from '../../src/clipboard/copyText';
import type { LogEntry } from '../../src/logs/types';

function entry(raw: string): LogEntry {
  return {
    id: 1,
    timestamp: 0,
    level: 'info',
    message: raw,
    raw,
  };
}

function writeStdinScript(file: string): { command: string; args: string[] } {
  return {
    command: process.execPath,
    args: [
      '-e',
      `require('node:fs').writeFileSync(${JSON.stringify(file)}, require('node:fs').readFileSync(0, 'utf8'))`,
    ],
  };
}

describe('formatLogsForClipboard', () => {
  it('joins stripped raw lines with a trailing newline', () => {
    expect(
      formatLogsForClipboard([
        entry('INFO one'),
        entry('\u001B[31mERROR two\u001B[0m'),
      ]),
    ).toBe('INFO one\nERROR two\n');
  });

  it('returns an empty string when there are no entries', () => {
    expect(formatLogsForClipboard([])).toBe('');
  });
});

describe('clipboardCommands', () => {
  it('uses pbcopy on macOS', () => {
    expect(clipboardCommands('darwin')).toEqual([
      { command: 'pbcopy', args: [] },
    ]);
  });

  it('tries wl-copy then xclip on Linux', () => {
    expect(clipboardCommands('linux')).toEqual([
      { command: 'wl-copy', args: [] },
      { command: 'xclip', args: ['-selection', 'clipboard'] },
    ]);
  });
});

describe('copyText', () => {
  it('writes stdin to the first available command', async () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), 'wed-clip-')), 'out');
    await copyText('hello\n', { commands: [writeStdinScript(file)] });
    expect(readFileSync(file, 'utf8')).toBe('hello\n');
  });

  it('skips a missing command and uses the next one', async () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), 'wed-clip-')), 'out');
    await copyText('next\n', {
      commands: [
        { command: 'definitely-not-a-wed-clipboard-tool', args: [] },
        writeStdinScript(file),
      ],
    });
    expect(readFileSync(file, 'utf8')).toBe('next\n');
  });

  it('rejects when no command is available', async () => {
    await expect(copyText('x', { commands: [] })).rejects.toThrow(
      /no clipboard command available/,
    );
  });
});

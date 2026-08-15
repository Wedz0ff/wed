import { spawn, type ChildProcess } from 'node:child_process';
import { stripAnsi } from '../ansi/stripAnsi';
import type { LogEntry } from '../logs/types';

export interface ClipboardCommand {
  command: string;
  args: string[];
}

type SpawnFn = (
  command: string,
  args: string[],
  options: { stdio: ['pipe', 'ignore', 'ignore'] },
) => ChildProcess;

export function formatLogsForClipboard(entries: LogEntry[]): string {
  if (entries.length === 0) {
    return '';
  }
  return `${entries.map((entry) => stripAnsi(entry.raw)).join('\n')}\n`;
}

export function clipboardCommands(
  platform: NodeJS.Platform = process.platform,
): ClipboardCommand[] {
  if (platform === 'darwin') {
    return [{ command: 'pbcopy', args: [] }];
  }
  if (platform === 'linux') {
    return [
      { command: 'wl-copy', args: [] },
      { command: 'xclip', args: ['-selection', 'clipboard'] },
    ];
  }
  return [];
}

export async function copyText(
  text: string,
  options: {
    commands?: ClipboardCommand[];
    spawn?: SpawnFn;
  } = {},
): Promise<void> {
  const commands = options.commands ?? clipboardCommands();
  const run = options.spawn ?? spawn;
  if (commands.length === 0) {
    throw new Error('no clipboard command available');
  }

  let lastMissing: Error | undefined;
  for (const command of commands) {
    try {
      await writeToCommand(run, command, text);
      return;
    } catch (error) {
      if (isMissing(error)) {
        lastMissing =
          error instanceof Error ? error : new Error(String(error));
        continue;
      }
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastMissing ?? new Error('no clipboard command available');
}

function writeToCommand(
  run: SpawnFn,
  command: ClipboardCommand,
  text: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = run(command.command, command.args, {
      stdio: ['pipe', 'ignore', 'ignore'],
    });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command.command} exited with ${code}`));
    });
    child.stdin?.end(text);
  });
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ENOENT'
  );
}

import { spawn } from 'node:child_process';

export type SpawnFn = (command: string, args: string[]) => Promise<void>;

function defaultSpawn(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore' });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0 || code === null) resolve();
      else reject(new Error(`${command} exited ${code}`));
    });
  });
}

export async function openBrowser(
  url: string,
  options: { platform?: NodeJS.Platform; spawn?: SpawnFn } = {},
): Promise<void> {
  const platform = options.platform ?? process.platform;
  const run = options.spawn ?? defaultSpawn;
  const command = platform === 'darwin' ? 'open' : 'xdg-open';
  await run(command, [url]);
}

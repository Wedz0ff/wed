import { render } from 'ink';
import { App } from './app/App';
import { SettingsApp } from './app/SettingsApp';
import { assertNodeVersion } from './cli/nodeVersion';
import { CliError, parseArgs } from './cli/parseArgs';
import { loadConfig } from './config/load';
import { resolveTheme } from './config/resolveTheme';
import { Session } from './session/Session';

const HELP = `mayu — process runner and log inspector

Usage:
  mayu [--theme=<name>] <command> [args...]
  mayu settings

Examples:
  mayu pnpm run dev
  mayu --theme=sakura node index.js
  mayu settings

Themes: cyberpunk (default), sakura, monochrome, gameboy
Saved in ~/.config/mayu/config.json. --theme overrides for one run.

macOS and Linux only. Requires Node.js 22+.
`;

async function main(): Promise<void> {
  assertNodeVersion();

  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof CliError ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
    return;
  }

  if (parsed.help) {
    console.log(HELP);
    return;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error('mayu requires an interactive TTY.');
    process.exitCode = 1;
    return;
  }

  const themeName = resolveTheme({
    theme: parsed.theme,
    themeExplicit: parsed.themeExplicit,
    config: loadConfig(),
  });

  if (parsed.settings) {
    render(<SettingsApp initialTheme={themeName} />, {
      exitOnCtrlC: false,
      ...alternateScreenOptions(),
    });
    return;
  }

  const session = new Session({
    command: parsed.command,
    args: parsed.args,
    themeName,
    cols: process.stdout.columns ?? 80,
    rows: process.stdout.rows ?? 24,
  });

  session.start();

  try {
    const instance = render(<App session={session} />, {
      exitOnCtrlC: false,
      ...alternateScreenOptions(),
    });

    const shutdown = async () => {
      await session.shutdown();
      instance.unmount();
    };

    process.once('SIGTERM', () => {
      void shutdown().finally(() => process.exit(1));
    });
  } catch (error) {
    await session.shutdown();
    throw error;
  }
}

function alternateScreenOptions(): Record<string, unknown> {
  return {
    alternateScreen: true,
  };
}

void main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

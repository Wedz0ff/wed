export type CommandResult =
  | { type: 'openSettings' }
  | { type: 'cancel' }
  | { type: 'error'; message: string };

type CommandHandler = (args: string[]) => CommandResult;

const COMMANDS: Record<string, CommandHandler> = {
  settings: (args) => {
    if (args.length > 0) {
      return { type: 'error', message: 'settings takes no arguments' };
    }
    return { type: 'openSettings' };
  },
};

export function runCommand(query: string): CommandResult {
  const parts = query.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { type: 'cancel' };
  }
  const name = parts[0]!.toLowerCase();
  const args = parts.slice(1);
  const command = COMMANDS[name];
  if (!command) {
    return { type: 'error', message: `unknown command: ${name}` };
  }
  return command(args);
}

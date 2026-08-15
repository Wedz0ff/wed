export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}

export interface ParsedArgs {
  theme: string;
  command: string;
  args: string[];
  help: boolean;
}

export function parseArgs(argv: string[]): ParsedArgs {
  let theme = 'cyberpunk';
  const rest: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;

    if (rest.length === 0 && (token === '--help' || token === '-h')) {
      return { theme, command: '', args: [], help: true };
    }

    if (rest.length === 0 && token.startsWith('--theme=')) {
      theme = token.slice('--theme='.length);
      continue;
    }

    if (rest.length === 0 && token === '--theme') {
      const value = argv[i + 1];
      if (!value) {
        throw new CliError('Missing value for --theme');
      }
      theme = value;
      i += 1;
      continue;
    }

    rest.push(token);
  }

  if (rest.length === 0) {
    throw new CliError('Usage: mayu [--theme=<name>] <command> [args...]');
  }

  return {
    theme,
    command: rest[0]!,
    args: rest.slice(1),
    help: false,
  };
}

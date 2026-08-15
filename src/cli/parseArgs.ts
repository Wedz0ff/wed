export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}

export interface ParsedArgs {
  theme: string;
  themeExplicit: boolean;
  command: string;
  args: string[];
  help: boolean;
  settings: boolean;
}

export function parseArgs(argv: string[]): ParsedArgs {
  let theme = 'cyberpunk';
  let themeExplicit = false;
  const rest: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;

    if (rest.length === 0 && (token === '--help' || token === '-h')) {
      return {
        theme,
        themeExplicit,
        command: '',
        args: [],
        help: true,
        settings: false,
      };
    }

    if (rest.length === 0 && token.startsWith('--theme=')) {
      theme = token.slice('--theme='.length);
      themeExplicit = true;
      continue;
    }

    if (rest.length === 0 && token === '--theme') {
      const value = argv[i + 1];
      if (!value) {
        throw new CliError('Missing value for --theme');
      }
      theme = value;
      themeExplicit = true;
      i += 1;
      continue;
    }

    rest.push(token);
  }

  if (rest[0] === 'settings') {
    if (rest.length > 1) {
      throw new CliError('Usage: wed settings');
    }
    return {
      theme,
      themeExplicit,
      command: '',
      args: [],
      help: false,
      settings: true,
    };
  }

  if (rest.length === 0) {
    throw new CliError('Usage: wed [--theme=<name>] <command> [args...]');
  }

  return {
    theme,
    themeExplicit,
    command: rest[0]!,
    args: rest.slice(1),
    help: false,
    settings: false,
  };
}

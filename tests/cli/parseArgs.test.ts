import { describe, expect, it } from 'vitest';
import { CliError, parseArgs } from '../../src/cli/parseArgs';

describe('parseArgs', () => {
  it('splits command and args without joining into a shell string', () => {
    expect(parseArgs(['pnpm', 'run', 'dev'])).toEqual({
      theme: 'cyberpunk',
      command: 'pnpm',
      args: ['run', 'dev'],
      help: false,
    });
  });

  it('parses --theme=sakura before the command', () => {
    expect(parseArgs(['--theme=sakura', 'node', 'index.js'])).toEqual({
      theme: 'sakura',
      command: 'node',
      args: ['index.js'],
      help: false,
    });
  });

  it('parses --theme as a separate argument', () => {
    expect(parseArgs(['--theme', 'monochrome', 'cargo', 'run'])).toEqual({
      theme: 'monochrome',
      command: 'cargo',
      args: ['run'],
      help: false,
    });
  });

  it('treats flags after the command as child args', () => {
    expect(parseArgs(['node', '--theme=sakura', 'app.js'])).toEqual({
      theme: 'cyberpunk',
      command: 'node',
      args: ['--theme=sakura', 'app.js'],
      help: false,
    });
  });

  it('throws a usage error when no command is given', () => {
    expect(() => parseArgs([])).toThrow(CliError);
    expect(() => parseArgs(['--theme=cyberpunk'])).toThrow(
      /Usage: mayu \[--theme=<name>\] <command> \[args\.\.\.\]/,
    );
  });

  it('throws when --theme is missing a value', () => {
    expect(() => parseArgs(['--theme'])).toThrow(CliError);
  });

  it('returns help when --help is passed', () => {
    expect(parseArgs(['--help'])).toMatchObject({ help: true, command: '' });
  });
});

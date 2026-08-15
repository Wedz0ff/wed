import { describe, expect, it } from 'vitest';
import { CliError, parseArgs } from '../../src/cli/parseArgs';

describe('parseArgs', () => {
  it('splits command and args without joining into a shell string', () => {
    expect(parseArgs(['pnpm', 'run', 'dev'])).toEqual({
      theme: 'cyberpunk',
      themeExplicit: false,
      command: 'pnpm',
      args: ['run', 'dev'],
      help: false,
      settings: false,
    });
  });

  it('parses --theme=sakura before the command', () => {
    expect(parseArgs(['--theme=sakura', 'node', 'index.js'])).toEqual({
      theme: 'sakura',
      themeExplicit: true,
      command: 'node',
      args: ['index.js'],
      help: false,
      settings: false,
    });
  });

  it('parses --theme as a separate argument', () => {
    expect(parseArgs(['--theme', 'monochrome', 'cargo', 'run'])).toEqual({
      theme: 'monochrome',
      themeExplicit: true,
      command: 'cargo',
      args: ['run'],
      help: false,
      settings: false,
    });
  });

  it('treats flags after the command as child args', () => {
    expect(parseArgs(['node', '--theme=sakura', 'app.js'])).toEqual({
      theme: 'cyberpunk',
      themeExplicit: false,
      command: 'node',
      args: ['--theme=sakura', 'app.js'],
      help: false,
      settings: false,
    });
  });

  it('throws a usage error when no command is given', () => {
    expect(() => parseArgs([])).toThrow(CliError);
    expect(() => parseArgs(['--theme=cyberpunk'])).toThrow(
      /Usage: wed \[--theme=<name>\] <command> \[args\.\.\.\]/,
    );
  });

  it('throws when --theme is missing a value', () => {
    expect(() => parseArgs(['--theme'])).toThrow(CliError);
  });

  it('returns help when --help is passed', () => {
    expect(parseArgs(['--help'])).toMatchObject({ help: true, command: '' });
  });

  it('treats settings as a reserved subcommand', () => {
    expect(parseArgs(['settings'])).toEqual({
      theme: 'cyberpunk',
      themeExplicit: false,
      command: '',
      args: [],
      help: false,
      settings: true,
    });
  });

  it('allows --theme before the settings subcommand', () => {
    expect(parseArgs(['--theme=sakura', 'settings'])).toMatchObject({
      theme: 'sakura',
      themeExplicit: true,
      settings: true,
      command: '',
    });
  });

  it('rejects extra arguments after settings', () => {
    expect(() => parseArgs(['settings', 'extra'])).toThrow(CliError);
    expect(() => parseArgs(['settings', 'extra'])).toThrow('Usage: wed settings');
  });
});

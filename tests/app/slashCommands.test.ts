import { describe, expect, it } from 'vitest';
import { runCommand } from '../../src/app/slashCommands';

describe('runCommand', () => {
  it('opens settings for settings with any casing', () => {
    expect(runCommand('settings')).toEqual({ type: 'openSettings' });
    expect(runCommand('  Settings  ')).toEqual({ type: 'openSettings' });
  });

  it('cancels on an empty prompt', () => {
    expect(runCommand('')).toEqual({ type: 'cancel' });
    expect(runCommand('   ')).toEqual({ type: 'cancel' });
  });

  it('rejects unknown commands', () => {
    expect(runCommand('theme')).toEqual({
      type: 'error',
      message: 'unknown command: theme',
    });
  });

  it('rejects extra arguments on settings', () => {
    expect(runCommand('settings sakura')).toEqual({
      type: 'error',
      message: 'settings takes no arguments',
    });
  });
});

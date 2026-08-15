import { describe, expect, it } from 'vitest';
import { configDir, configPath } from '../../src/config/paths';

describe('config paths', () => {
  it('uses XDG_CONFIG_HOME/wed when set', () => {
    expect(configDir({ XDG_CONFIG_HOME: '/tmp/xdg' }, '/home/me')).toBe(
      '/tmp/xdg/wed',
    );
    expect(configPath({ XDG_CONFIG_HOME: '/tmp/xdg' }, '/home/me')).toBe(
      '/tmp/xdg/wed/config.json',
    );
  });

  it('falls back to ~/.config/wed when XDG_CONFIG_HOME is unset', () => {
    expect(configDir({}, '/Users/luca')).toBe('/Users/luca/.config/wed');
    expect(configPath({}, '/Users/luca')).toBe(
      '/Users/luca/.config/wed/config.json',
    );
  });
});

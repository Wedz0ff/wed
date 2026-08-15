import { describe, expect, it } from 'vitest';
import { resolveTheme } from '../../src/config/resolveTheme';

describe('resolveTheme', () => {
  it('uses an explicit --theme flag over the saved config', () => {
    expect(
      resolveTheme({
        theme: 'gameboy',
        themeExplicit: true,
        config: { theme: 'sakura' },
      }),
    ).toBe('gameboy');
  });

  it('uses a known saved theme when --theme is omitted', () => {
    expect(
      resolveTheme({
        theme: 'cyberpunk',
        themeExplicit: false,
        config: { theme: 'sakura' },
      }),
    ).toBe('sakura');
  });

  it('falls back to cyberpunk when config is missing or unknown', () => {
    expect(
      resolveTheme({
        theme: 'cyberpunk',
        themeExplicit: false,
        config: {},
      }),
    ).toBe('cyberpunk');
    expect(
      resolveTheme({
        theme: 'cyberpunk',
        themeExplicit: false,
        config: { theme: 'neon-void' },
      }),
    ).toBe('cyberpunk');
  });
});

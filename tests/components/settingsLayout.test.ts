import { describe, expect, it } from 'vitest';
import { settingsColumns } from '../../src/components/settingsLayout';

describe('settingsColumns', () => {
  it('puts web UI on the left and themes on the right', () => {
    expect(settingsColumns(['cyberpunk', 'sakura'], true)).toEqual({
      left: { title: 'WEB UI', items: ['Web UI    ON'] },
      right: { title: 'THEME', items: ['cyberpunk', 'sakura'] },
    });
  });

  it('shows OFF when the web UI is disabled', () => {
    expect(settingsColumns(['gameboy'], false)).toEqual({
      left: { title: 'WEB UI', items: ['Web UI    OFF'] },
      right: { title: 'THEME', items: ['gameboy'] },
    });
  });
});

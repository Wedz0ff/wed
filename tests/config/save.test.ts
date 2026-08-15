import { readFileSync, writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/load';
import { saveConfig } from '../../src/config/save';

function tempDir(): string {
  return mkdtempSync(path.join(tmpdir(), 'mayu-config-'));
}

describe('saveConfig', () => {
  it('creates the parent directory and writes pretty JSON', () => {
    const file = path.join(tempDir(), 'nested', 'config.json');
    saveConfig({ theme: 'sakura' }, file);
    expect(readFileSync(file, 'utf8')).toBe('{\n  "theme": "sakura"\n}\n');
    expect(loadConfig(file)).toEqual({ theme: 'sakura' });
  });

  it('merges with existing keys so unknown fields are kept', () => {
    const file = path.join(tempDir(), 'config.json');
    writeFileSync(file, JSON.stringify({ theme: 'cyberpunk', extra: true }));
    saveConfig({ theme: 'gameboy' }, file);
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({
      theme: 'gameboy',
      extra: true,
    });
  });

  it('overwrites invalid existing JSON instead of throwing', () => {
    const file = path.join(tempDir(), 'config.json');
    writeFileSync(file, '{ broken');
    saveConfig({ theme: 'monochrome' }, file);
    expect(loadConfig(file)).toEqual({ theme: 'monochrome' });
  });
});

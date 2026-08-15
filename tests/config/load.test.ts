import { mkdirSync, writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isWebUiEnabled, loadConfig } from '../../src/config/load';

function tempFile(name: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'wed-config-'));
  return path.join(dir, name);
}

describe('loadConfig', () => {
  it('returns an empty config when the file is missing', () => {
    expect(loadConfig(tempFile('missing.json'))).toEqual({});
  });

  it('reads a valid theme from JSON', () => {
    const file = tempFile('config.json');
    writeFileSync(file, '{ "theme": "sakura" }\n');
    expect(loadConfig(file)).toEqual({ theme: 'sakura' });
  });

  it('returns an empty config for invalid JSON', () => {
    const file = tempFile('config.json');
    writeFileSync(file, '{ not json');
    expect(loadConfig(file)).toEqual({});
  });

  it('ignores a non-string theme value', () => {
    const file = tempFile('config.json');
    writeFileSync(file, '{ "theme": 12 }');
    expect(loadConfig(file)).toEqual({});
  });

  it('returns an empty config when the path is a directory', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'wed-config-'));
    mkdirSync(path.join(dir, 'nested'));
    expect(loadConfig(dir)).toEqual({});
  });

  it('treats missing webUi as enabled', () => {
    expect(isWebUiEnabled({})).toBe(true);
    expect(isWebUiEnabled({ theme: 'sakura' })).toBe(true);
  });

  it('reads webUi false from JSON', () => {
    const file = tempFile('config.json');
    writeFileSync(file, '{ "theme": "sakura", "webUi": false }\n');
    expect(loadConfig(file)).toEqual({ theme: 'sakura', webUi: false });
    expect(isWebUiEnabled(loadConfig(file))).toBe(false);
  });

  it('ignores a non-boolean webUi value', () => {
    const file = tempFile('config.json');
    writeFileSync(file, '{ "webUi": "no" }');
    expect(loadConfig(file)).toEqual({});
    expect(isWebUiEnabled(loadConfig(file))).toBe(true);
  });
});

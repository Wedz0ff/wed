import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadRawConfig } from './load';
import { configPath } from './paths';
import type { MayuConfig } from './types';

export function saveConfig(
  update: MayuConfig,
  filePath: string = configPath(),
): void {
  const existing = loadRawConfig(filePath);
  const next = { ...existing, ...update };
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
}

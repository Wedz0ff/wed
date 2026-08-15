import { readFileSync } from 'node:fs';
import { configPath } from './paths';
import type { WedConfig } from './types';

export function loadRawConfig(
  filePath: string = configPath(),
): Record<string, unknown> {
  try {
    const text = readFileSync(filePath, 'utf8');
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

export function loadConfig(filePath: string = configPath()): WedConfig {
  const raw = loadRawConfig(filePath);
  return typeof raw.theme === 'string' ? { theme: raw.theme } : {};
}

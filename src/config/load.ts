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
  const config: WedConfig = {};
  if (typeof raw.theme === 'string') {
    config.theme = raw.theme;
  }
  if (typeof raw.webUi === 'boolean') {
    config.webUi = raw.webUi;
  }
  return config;
}

export function isWebUiEnabled(config: WedConfig): boolean {
  return config.webUi !== false;
}

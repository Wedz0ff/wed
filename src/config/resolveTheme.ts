import { listThemes } from '../themes/index';
import type { WedConfig } from './types';

export function resolveTheme(options: {
  theme: string;
  themeExplicit: boolean;
  config: WedConfig;
}): string {
  if (options.themeExplicit) {
    return options.theme;
  }
  const saved = options.config.theme;
  if (saved && listThemes().includes(saved)) {
    return saved;
  }
  return 'cyberpunk';
}

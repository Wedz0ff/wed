import { cyberpunk } from './cyberpunk';
import { gameboy } from './gameboy';
import { monochrome } from './monochrome';
import { sakura } from './sakura';
import type { Theme } from './types';

const THEMES: Record<string, Theme> = {
  cyberpunk,
  sakura,
  monochrome,
  gameboy,
};

export function getTheme(name: string): Theme {
  return THEMES[name] ?? cyberpunk;
}

export function listThemes(): string[] {
  return Object.keys(THEMES);
}

export type { Theme } from './types';
export { cyberpunk, sakura, monochrome, gameboy };

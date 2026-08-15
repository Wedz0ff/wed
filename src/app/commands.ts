import type { LogLevel } from '../logs/types';

export type UiMode = 'normal' | 'filter' | 'search' | 'inspect';

export interface KeyLike {
  upArrow: boolean;
  downArrow: boolean;
  pageUp: boolean;
  pageDown: boolean;
  return: boolean;
  escape: boolean;
  ctrl: boolean;
  shift: boolean;
  backspace: boolean;
  delete: boolean;
  home: boolean;
  end: boolean;
}

export type Action =
  | { type: 'quit' }
  | { type: 'ctrlC' }
  | { type: 'toggleFollow' }
  | { type: 'clear' }
  | { type: 'openFilter' }
  | { type: 'openSearch' }
  | { type: 'escape' }
  | { type: 'scroll'; delta: number }
  | { type: 'page'; direction: -1 | 1 }
  | { type: 'home' }
  | { type: 'end' }
  | { type: 'setLevel'; level: LogLevel | 'all' }
  | { type: 'restart' }
  | { type: 'inspect' }
  | { type: 'input'; text: string }
  | { type: 'backspace' }
  | { type: 'searchNext' }
  | { type: 'searchPrev' };

const LEVEL_KEYS: Record<string, LogLevel | 'all'> = {
  '1': 'all',
  '2': 'debug',
  '3': 'info',
  '4': 'warn',
  '5': 'error',
};

export function mapKeyToAction(
  input: string,
  key: KeyLike,
  mode: UiMode,
): Action | null {
  if (key.ctrl && input === 'c') {
    return { type: 'ctrlC' };
  }

  if (mode === 'filter' || mode === 'search') {
    if (key.escape) return { type: 'escape' };
    if (key.backspace || key.delete) return { type: 'backspace' };
    if (mode === 'search' && input === 'n' && !key.shift) {
      return { type: 'searchNext' };
    }
    if (mode === 'search' && (input === 'N' || (input === 'n' && key.shift))) {
      return { type: 'searchPrev' };
    }
    if (key.return) return { type: 'escape' };
    if (input && !key.ctrl) return { type: 'input', text: input };
    return null;
  }

  if (mode === 'inspect') {
    if (key.escape) return { type: 'escape' };
    if (input === 'q') return { type: 'quit' };
    return null;
  }

  if (key.escape) return { type: 'escape' };
  if (key.upArrow) return { type: 'scroll', delta: -1 };
  if (key.downArrow) return { type: 'scroll', delta: 1 };
  if (key.pageUp) return { type: 'page', direction: -1 };
  if (key.pageDown) return { type: 'page', direction: 1 };
  if (key.home) return { type: 'home' };
  if (key.end) return { type: 'end' };
  if (key.return) return { type: 'inspect' };

  if (input === 'q') return { type: 'quit' };
  if (input === 'p') return { type: 'toggleFollow' };
  if (input === 'c') return { type: 'clear' };
  if (input === 'f') return { type: 'openFilter' };
  if (input === '/') return { type: 'openSearch' };
  if (input === 'r') return { type: 'restart' };

  const level = LEVEL_KEYS[input];
  if (level) return { type: 'setLevel', level };

  return null;
}

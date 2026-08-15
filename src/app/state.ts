import type { LogLevel } from '../logs/types';
import type { UiMode } from './commands';

export interface UiState {
  follow: boolean;
  filterQuery: string;
  filterLevel: LogLevel | 'all';
  searchQuery: string;
  searchIndex: number;
  selectedIndex: number;
  scrollOffset: number;
  mode: UiMode;
  themeName: string;
  visibleRowCount: number;
  settingsIndex: number;
  settingsOpenedTheme: string;
  settingsWebUi: boolean;
  settingsOpenedWebUi: boolean;
  settingsError?: string;
  copyStatus?: string;
  commandQuery: string;
  commandError?: string;
}

export function createUiState(
  themeName: string,
  visibleRowCount: number,
): UiState {
  return {
    follow: true,
    filterQuery: '',
    filterLevel: 'all',
    searchQuery: '',
    searchIndex: 0,
    selectedIndex: 0,
    scrollOffset: 0,
    mode: 'normal',
    themeName,
    visibleRowCount,
    settingsIndex: 0,
    settingsOpenedTheme: themeName,
    settingsWebUi: true,
    settingsOpenedWebUi: true,
    commandQuery: '',
  };
}

export function formatUptime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

export type DisplayStatus =
  'STARTING' | 'RUNNING' | 'PAUSED' | 'EXITED' | 'FAILED' | 'TERMINATING';

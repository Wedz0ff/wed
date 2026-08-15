import { Box, Text } from 'ink';
import type { Theme } from '../themes/types';

interface StatusBarProps {
  filteredCount: number;
  totalCount: number;
  errorCount: number;
  searchMatches: number;
  mode: string;
  copyStatus?: string;
  webError?: string;
  theme: Theme;
}

export function StatusBar({
  filteredCount,
  totalCount,
  errorCount,
  searchMatches,
  mode,
  copyStatus,
  webError,
  theme,
}: StatusBarProps) {
  return (
    <Box
      borderStyle="single"
      borderColor={theme.muted}
      paddingX={1}
      justifyContent="space-between"
    >
      <Text color={theme.foreground}>
        {filteredCount}/{totalCount} logs
        <Text color={theme.error}> {errorCount} error</Text>
        {searchMatches > 0 ? (
          <Text color={theme.primary}> {searchMatches} match</Text>
        ) : null}
      </Text>
      <Text color={theme.muted}>
        {copyStatus
          ? copyStatus
          : webError &&
              mode !== 'search' &&
              mode !== 'command' &&
              mode !== 'settings'
            ? webError
            : mode === 'search'
              ? 'n/N next  Esc exit'
              : mode === 'command'
                ? 'Enter run  Esc cancel'
                : mode === 'settings'
                  ? '↑↓ preview  Enter save  Esc cancel'
                  : '↑↓ scroll  / search  ! command  c copy  p pause  q quit  w web'}
      </Text>
    </Box>
  );
}

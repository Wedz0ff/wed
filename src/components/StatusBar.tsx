import { Box, Text } from 'ink';
import type { Theme } from '../themes/types';

interface StatusBarProps {
  filteredCount: number;
  totalCount: number;
  errorCount: number;
  searchMatches: number;
  mode: string;
  theme: Theme;
}

export function StatusBar({
  filteredCount,
  totalCount,
  errorCount,
  searchMatches,
  mode,
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
        <Text color={theme.error}>  {errorCount} error</Text>
        {searchMatches > 0 ? (
          <Text color={theme.primary}>  {searchMatches} match</Text>
        ) : null}
      </Text>
      <Text color={theme.muted}>
        {mode === 'search'
          ? 'n/N next  Esc exit'
          : '↑↓ scroll  / search  p pause  q quit'}
      </Text>
    </Box>
  );
}

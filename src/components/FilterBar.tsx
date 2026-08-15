import { Box, Text } from 'ink';
import type { UiState } from '../app/state';
import type { Theme } from '../themes/types';

interface FilterBarProps {
  ui: UiState;
  theme: Theme;
}

export function FilterBar({ ui, theme }: FilterBarProps) {
  const level = ui.filterLevel === 'all' ? 'ALL' : ui.filterLevel.toUpperCase();
  const filterActive = ui.mode === 'filter';
  const searchActive = ui.mode === 'search';

  return (
    <Box
      borderStyle="single"
      borderColor={theme.muted}
      paddingX={1}
      justifyContent="space-between"
    >
      <Text>
        <Text color={theme.muted}>Filter: </Text>
        <Text color={filterActive ? theme.primary : theme.foreground} inverse={filterActive}>
          {ui.filterQuery || '____________________'}
        </Text>
        {searchActive ? (
          <Text color={theme.primary}>
            {'  /'}
            {ui.searchQuery}
          </Text>
        ) : null}
      </Text>
      <Text color={theme.secondary}>Level: {level}</Text>
    </Box>
  );
}

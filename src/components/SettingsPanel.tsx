import { Box, Text } from 'ink';
import type { Theme } from '../themes/types';

interface SettingsPanelProps {
  themes: string[];
  selectedIndex: number;
  theme: Theme;
  error?: string;
}

export function SettingsPanel({
  themes,
  selectedIndex,
  theme,
  error,
}: SettingsPanelProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={theme.primary}
      paddingX={1}
      flexGrow={1}
    >
      <Text color={theme.primary} bold>
        THEME
      </Text>
      {themes.map((name, index) => {
        const selected = index === selectedIndex;
        return (
          <Text
            key={name}
            color={selected ? theme.primary : theme.foreground}
            inverse={selected}
          >
            {selected ? '> ' : '  '}
            {name}
          </Text>
        );
      })}
      {error ? (
        <Text color={theme.warning}>Could not save: {error}</Text>
      ) : (
        <Text color={theme.muted}>
          Enter saves to ~/.config/mayu/config.json
        </Text>
      )}
    </Box>
  );
}

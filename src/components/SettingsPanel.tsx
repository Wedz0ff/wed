import { Box, Text } from 'ink';
import type { Theme } from '../themes/types';

interface SettingsPanelProps {
  themes: string[];
  selectedIndex: number;
  theme: Theme;
  webUi: boolean;
  error?: string;
}

export function SettingsPanel({
  themes,
  selectedIndex,
  theme,
  webUi,
  error,
}: SettingsPanelProps) {
  const webSelected = selectedIndex === 0;
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
      <Text
        color={webSelected ? theme.primary : theme.foreground}
        inverse={webSelected}
      >
        {webSelected ? '> ' : '  '}
        Web UI    {webUi ? 'ON' : 'OFF'}
      </Text>
      {themes.map((name, index) => {
        const selected = index + 1 === selectedIndex;
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
          Enter saves to ~/.config/wed/config.json
        </Text>
      )}
    </Box>
  );
}

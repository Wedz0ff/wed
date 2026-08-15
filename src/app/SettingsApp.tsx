import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { useState } from 'react';
import { saveConfig } from '../config/save';
import { SettingsPanel } from '../components/SettingsPanel';
import { getTheme, listThemes } from '../themes/index';

interface SettingsAppProps {
  initialTheme: string;
}

export function SettingsApp({ initialTheme }: SettingsAppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const themes = listThemes();
  const start = themes.indexOf(initialTheme);
  const [selectedIndex, setSelectedIndex] = useState(start >= 0 ? start : 0);
  const [error, setError] = useState<string | undefined>();
  const themeName = themes[selectedIndex] ?? 'cyberpunk';
  const theme = getTheme(themeName);

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      exit();
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((index) => Math.max(0, index - 1));
      setError(undefined);
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((index) => Math.min(themes.length - 1, index + 1));
      setError(undefined);
      return;
    }
    if (key.return) {
      try {
        saveConfig({ theme: themeName });
        exit();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    }
  });

  return (
    <Box
      flexDirection="column"
      width={stdout.columns || 80}
      height={stdout.rows || 24}
    >
      <Box borderStyle="single" borderColor={theme.primary} paddingX={1}>
        <Text color={theme.primary} bold>
          mayu settings
        </Text>
      </Box>
      <SettingsPanel
        themes={themes}
        selectedIndex={selectedIndex}
        theme={theme}
        error={error}
      />
      <Box paddingX={1}>
        <Text color={theme.muted}>↑↓ preview Enter save Esc quit</Text>
      </Box>
    </Box>
  );
}

import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { useState } from 'react';
import { APP_NAME, formatAppVersion } from './version';
import { isWebUiEnabled, loadConfig } from '../config/load';
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
  const [selectedIndex, setSelectedIndex] = useState(
    (start >= 0 ? start : 0) + 1,
  );
  const [themeName, setThemeName] = useState(initialTheme);
  const [webUi, setWebUi] = useState(() => isWebUiEnabled(loadConfig()));
  const [error, setError] = useState<string | undefined>();
  const theme = getTheme(themeName);

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      exit();
      return;
    }
    if (key.upArrow) {
      const next = Math.max(0, selectedIndex - 1);
      setSelectedIndex(next);
      if (next > 0) {
        setThemeName(themes[next - 1] ?? initialTheme);
      }
      setError(undefined);
      return;
    }
    if (key.downArrow) {
      const next = Math.min(themes.length, selectedIndex + 1);
      setSelectedIndex(next);
      if (next > 0) {
        setThemeName(themes[next - 1] ?? initialTheme);
      }
      setError(undefined);
      return;
    }
    if (input === ' ') {
      if (selectedIndex === 0) {
        setWebUi((value) => !value);
      }
      return;
    }
    if (key.leftArrow) {
      setSelectedIndex(0);
      setError(undefined);
      return;
    }
    if (key.rightArrow) {
      if (selectedIndex === 0) {
        const index = themes.indexOf(themeName);
        setSelectedIndex((index >= 0 ? index : 0) + 1);
      }
      setError(undefined);
      return;
    }
    if (key.return) {
      try {
        saveConfig({ theme: themeName, webUi });
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
        <Text>
          <Text color={theme.primary} bold>
            {APP_NAME} settings
          </Text>
          <Text color={theme.muted}> {formatAppVersion()}</Text>
        </Text>
      </Box>
      <SettingsPanel
        themes={themes}
        selectedIndex={selectedIndex}
        theme={theme}
        webUi={webUi}
        error={error}
      />
      <Box paddingX={1}>
        <Text color={theme.muted}>
          ←→ section  Space toggle  Enter save  Esc quit
        </Text>
      </Box>
    </Box>
  );
}

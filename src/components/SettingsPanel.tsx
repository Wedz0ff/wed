import { Box, Text } from 'ink';
import type { Theme } from '../themes/types';
import { settingsColumns } from './settingsLayout';

interface SettingsPanelProps {
  themes: string[];
  selectedIndex: number;
  theme: Theme;
  webUi: boolean;
  error?: string;
}

function Column({
  title,
  items,
  selectedIndex,
  indexOffset,
  active,
  theme,
}: {
  title: string;
  items: string[];
  selectedIndex: number;
  indexOffset: number;
  active: boolean;
  theme: Theme;
}) {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={active ? theme.primary : theme.muted}
      paddingX={1}
      flexGrow={1}
    >
      <Text color={theme.primary} bold>
        {title}
      </Text>
      {items.map((label, offset) => {
        const index = indexOffset + offset;
        const selected = index === selectedIndex;
        return (
          <Text
            key={label}
            color={selected ? theme.primary : theme.foreground}
            inverse={selected}
          >
            {selected ? '> ' : '  '}
            {label}
          </Text>
        );
      })}
    </Box>
  );
}

export function SettingsPanel({
  themes,
  selectedIndex,
  theme,
  webUi,
  error,
}: SettingsPanelProps) {
  const columns = settingsColumns(themes, webUi);
  const webSelected = selectedIndex === 0;
  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box flexDirection="row" flexGrow={1}>
        <Column
          title={columns.left.title}
          items={columns.left.items}
          selectedIndex={selectedIndex}
          indexOffset={0}
          active={webSelected}
          theme={theme}
        />
        <Column
          title={columns.right.title}
          items={columns.right.items}
          selectedIndex={selectedIndex}
          indexOffset={1}
          active={!webSelected}
          theme={theme}
        />
      </Box>
      {error ? (
        <Text color={theme.warning}>Could not save: {error}</Text>
      ) : (
        <Text color={theme.muted}>
          ←→ section  Space toggle  Enter saves to ~/.config/wed/config.json
        </Text>
      )}
    </Box>
  );
}

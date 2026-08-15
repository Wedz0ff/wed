import { Box, Text } from 'ink';
import type { DisplayStatus } from '../app/state';
import { formatUptime } from '../app/state';
import type { Theme } from '../themes/types';

interface ProcessPanelProps {
  command: string;
  args: string[];
  pid?: number;
  status: DisplayStatus;
  startedAt?: number;
  now: number;
  exitCode?: number;
  theme: Theme;
}

export function ProcessPanel({
  command,
  args,
  pid,
  status,
  startedAt,
  now,
  exitCode,
  theme,
}: ProcessPanelProps) {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color={theme.secondary} bold>
        PROCESS
      </Text>
      <Text color={theme.foreground}>
        {[command, ...args].join(' ')}
      </Text>
      <Text color={theme.muted}>
        PID {pid ?? '-'}  STATUS {status}  UPTIME{' '}
        {formatUptime(startedAt ? now - startedAt : 0)}
        {exitCode !== undefined ? `  EXIT ${exitCode}` : ''}
      </Text>
    </Box>
  );
}

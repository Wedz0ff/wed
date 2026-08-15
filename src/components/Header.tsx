import { Box, Text } from 'ink';
import { formatUptime, type DisplayStatus } from '../app/state';
import type { Theme } from '../themes/types';

const MASCOT: Record<string, string> = {
  RUNNING: '(•‿•)',
  PAUSED: '(-‿-)z',
  FAILED: '(>=A<=)',
  EXITED: '(x_x)',
  STARTING: '(·ω·)',
  TERMINATING: '(o_o)',
};

interface HeaderProps {
  command: string;
  args: string[];
  status: DisplayStatus;
  pid?: number;
  startedAt?: number;
  now: number;
  theme: Theme;
}

export function Header({
  command,
  args,
  status,
  pid,
  startedAt,
  now,
  theme,
}: HeaderProps) {
  const cmdline = [command, ...args].join(' ');
  const uptime = formatUptime(startedAt ? now - startedAt : 0);
  const mascot = MASCOT[status] ?? '(•‿•)';
  const statusColor =
    status === 'FAILED'
      ? theme.error
      : status === 'PAUSED'
        ? theme.warning
        : status === 'RUNNING'
          ? theme.success
          : theme.muted;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={theme.primary}
      paddingX={1}
    >
      <Box justifyContent="space-between">
        <Text color={theme.primary} bold>
          mayu
        </Text>
        <Text>
          <Text color={theme.muted}>{mascot} </Text>
          <Text color={statusColor} bold>
            ● {status}
          </Text>
        </Text>
      </Box>
      <Box justifyContent="space-between">
        <Text color={theme.foreground}>
          {'> '}
          {cmdline}
          {pid ? <Text color={theme.muted}>  pid {pid}</Text> : null}
        </Text>
        <Text color={theme.muted}>{uptime}</Text>
      </Box>
    </Box>
  );
}

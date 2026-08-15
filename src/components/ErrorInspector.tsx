import { Box, Text } from 'ink';
import type { ExtractedStack } from '../logs/StackTrace';
import type { Theme } from '../themes/types';

interface ErrorInspectorProps {
  stack: ExtractedStack;
  command: string;
  pid?: number;
  timestamp: number;
  theme: Theme;
}

export function ErrorInspector({
  stack,
  command,
  pid,
  timestamp,
  theme,
}: ErrorInspectorProps) {
  const time = new Date(timestamp).toLocaleTimeString();

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={theme.error}
      paddingX={1}
    >
      <Box justifyContent="space-between">
        <Text color={theme.error} bold>
          ERROR
        </Text>
        <Text color={theme.muted}>{time}</Text>
      </Box>
      {stack.body.map((line) => (
        <Text key={line} color={theme.foreground}>
          {line}
        </Text>
      ))}
      {stack.frames.length > 0 ? (
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.secondary} bold>
            STACK TRACE
          </Text>
          {stack.frames.map((frame) => (
            <Text key={frame} color={theme.muted}>
              {frame}
            </Text>
          ))}
        </Box>
      ) : null}
      <Box flexDirection="column" marginTop={1}>
        <Text color={theme.secondary} bold>
          PROCESS
        </Text>
        <Text color={theme.foreground}>{command}</Text>
        {pid ? <Text color={theme.muted}>PID {pid}</Text> : null}
      </Box>
      <Text color={theme.muted}>Esc close</Text>
    </Box>
  );
}

import { Box } from 'ink';
import type { LogEntry } from '../logs/types';
import type { Theme } from '../themes/types';
import { LogLine } from './LogLine';

interface LogViewerProps {
  logs: LogEntry[];
  selectedId?: number;
  searchQuery: string;
  height: number;
  theme: Theme;
}

export function LogViewer({
  logs,
  selectedId,
  searchQuery,
  height,
  theme,
}: LogViewerProps) {
  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      height={height}
      overflow="hidden"
      paddingX={1}
    >
      {logs.map((entry) => (
        <LogLine
          key={entry.id}
          entry={entry}
          selected={entry.id === selectedId}
          searchQuery={searchQuery}
          theme={theme}
        />
      ))}
    </Box>
  );
}

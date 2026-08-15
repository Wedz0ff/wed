import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { useEffect, useState } from 'react';
import { mapKeyToAction } from './commands';
import type { Session } from '../session/Session';
import { ErrorInspector } from '../components/ErrorInspector';
import { FilterBar } from '../components/FilterBar';
import { Header } from '../components/Header';
import { LogViewer } from '../components/LogViewer';
import { StatusBar } from '../components/StatusBar';

interface AppProps {
  session: Session;
}

export function App({ session }: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [now, setNow] = useState(() => Date.now());
  const [snap, setSnap] = useState(() => session.getSnapshot());

  useEffect(() => {
    return session.subscribe(() => {
      setSnap(session.getSnapshot());
    });
  }, [session]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onResize = () => {
      session.resize(stdout.columns || 80, stdout.rows || 24);
    };
    stdout.on('resize', onResize);
    return () => {
      stdout.off('resize', onResize);
    };
  }, [session, stdout]);

  useEffect(() => {
    if (!snap.exitRequested) {
      return;
    }
    void session.shutdown().finally(() => {
      exit();
      if (snap.forceExit) {
        process.exit(1);
      }
    });
  }, [snap.exitRequested, snap.forceExit, session, exit]);

  useInput((input, key) => {
    const action = mapKeyToAction(input, key, snap.ui.mode);
    if (action) {
      session.dispatch(action);
    }
  });

  const selectedEntry =
    snap.visibleLogs[snap.ui.selectedIndex - snap.ui.scrollOffset];
  const selectedId = selectedEntry?.id;

  return (
    <Box flexDirection="column" width={stdout.columns || 80} height={stdout.rows || 24}>
      <Header
        command={snap.command}
        args={snap.args}
        status={snap.displayStatus}
        pid={snap.pid}
        startedAt={snap.startedAt}
        now={now}
        theme={snap.theme}
      />
      <FilterBar ui={snap.ui} theme={snap.theme} />
      {snap.ui.mode === 'inspect' && snap.inspector ? (
        <ErrorInspector
          stack={snap.inspector}
          command={[snap.command, ...snap.args].join(' ')}
          pid={snap.pid}
          timestamp={selectedEntry?.timestamp ?? Date.now()}
          theme={snap.theme}
        />
      ) : (
        <LogViewer
          logs={snap.visibleLogs}
          selectedId={selectedId}
          searchQuery={snap.ui.mode === 'search' ? snap.ui.searchQuery : ''}
          height={snap.ui.visibleRowCount}
          theme={snap.theme}
        />
      )}
      <StatusBar
        filteredCount={snap.filteredCount}
        totalCount={snap.totalCount}
        errorCount={snap.errorCount}
        searchMatches={snap.searchMatches}
        mode={snap.ui.mode}
        theme={snap.theme}
      />
      {snap.status === 'exited' || snap.status === 'failed' ? (
        <Box paddingX={1}>
          <Text color={snap.theme.muted}>
            Exit code: {snap.exitCode ?? snap.lastError ?? 'unknown'}  [r]
            Restart  [q] Quit
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}

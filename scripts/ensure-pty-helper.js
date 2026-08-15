import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

try {
  const ptyDir = path.dirname(require.resolve('node-pty/package.json'));
  const helper = path.join(
    ptyDir,
    'prebuilds',
    `${process.platform}-${process.arch}`,
    'spawn-helper',
  );
  if (fs.existsSync(helper)) {
    fs.chmodSync(helper, 0o755);
  }
} catch {
  // node-pty may be absent on unsupported platforms.
}

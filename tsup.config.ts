import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  banner: {
    js: '#!/usr/bin/env node',
  },
  skipNodeModulesBundle: true,
  clean: true,
  sourcemap: true,
  dts: false,
});

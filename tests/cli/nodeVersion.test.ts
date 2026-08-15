import { describe, expect, it } from 'vitest';
import { assertNodeVersion } from '../../src/cli/nodeVersion';

describe('assertNodeVersion', () => {
  it('allows Node 22 and newer', () => {
    expect(() => assertNodeVersion('v22.0.0')).not.toThrow();
    expect(() => assertNodeVersion('v24.19.0')).not.toThrow();
  });

  it('rejects older Node versions with a clear message', () => {
    expect(() => assertNodeVersion('v18.20.8')).toThrow(
      'wed requires Node.js 22 or newer.\nCurrent version: v18.20.8',
    );
  });
});

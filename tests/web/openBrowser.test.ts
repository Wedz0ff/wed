import { describe, expect, it } from 'vitest';
import { openBrowser } from '../../src/web/openBrowser';

describe('openBrowser', () => {
  it('uses open on darwin', async () => {
    const calls: string[][] = [];
    await openBrowser('http://127.0.0.1:9/', {
      platform: 'darwin',
      spawn: async (command, args) => {
        calls.push([command, ...args]);
      },
    });
    expect(calls).toEqual([['open', 'http://127.0.0.1:9/']]);
  });

  it('uses xdg-open on linux', async () => {
    const calls: string[][] = [];
    await openBrowser('http://127.0.0.1:9/', {
      platform: 'linux',
      spawn: async (command, args) => {
        calls.push([command, ...args]);
      },
    });
    expect(calls).toEqual([['xdg-open', 'http://127.0.0.1:9/']]);
  });

  it('throws when the opener fails', async () => {
    await expect(
      openBrowser('http://127.0.0.1:9/', {
        platform: 'darwin',
        spawn: async () => {
          throw new Error('boom');
        },
      }),
    ).rejects.toThrow('boom');
  });
});

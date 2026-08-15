import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { APP_NAME, formatAppVersion } from '../../src/app/version';

const pkg = JSON.parse(
  readFileSync(
    path.join(fileURLToPath(new URL('../..', import.meta.url)), 'package.json'),
    'utf8',
  ),
) as { version: string };

describe('app branding', () => {
  it('uses Wed as the display name', () => {
    expect(APP_NAME).toBe('Wed');
  });

  it('formats the version from package.json', () => {
    expect(formatAppVersion()).toBe(`v${pkg.version}`);
    expect(formatAppVersion()).toBe('v0.1.0');
  });
});

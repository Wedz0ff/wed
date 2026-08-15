import pkg from '../../package.json' with { type: 'json' };

export const APP_NAME = 'Wed';

export function formatAppVersion(version: string = pkg.version): string {
  return `v${version}`;
}

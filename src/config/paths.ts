import os from 'node:os';
import path from 'node:path';

export function configDir(
  env: NodeJS.ProcessEnv = process.env,
  home: string = os.homedir(),
): string {
  const xdg = env.XDG_CONFIG_HOME;
  if (xdg) {
    return path.join(xdg, 'mayu');
  }
  return path.join(home, '.config', 'mayu');
}

export function configPath(
  env: NodeJS.ProcessEnv = process.env,
  home: string = os.homedir(),
): string {
  return path.join(configDir(env, home), 'config.json');
}

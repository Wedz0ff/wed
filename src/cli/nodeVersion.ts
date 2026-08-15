const MIN_MAJOR = 22;

export function assertNodeVersion(
  version: string = process.version,
  minMajor: number = MIN_MAJOR,
): void {
  const major = Number.parseInt(version.replace(/^v/, '').split('.')[0] ?? '', 10);
  if (!Number.isFinite(major) || major < minMajor) {
    throw new Error(
      `wed requires Node.js ${minMajor} or newer.\nCurrent version: ${version}`,
    );
  }
}

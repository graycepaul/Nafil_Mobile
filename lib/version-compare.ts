/**
 * Compares two "MAJOR.MINOR.PATCH"-style version strings. Returns negative if
 * `a` is older than `b`, positive if newer, 0 if equal. Deliberately doesn't
 * pull in a semver package — app.json's version field is always a plain
 * three-part number here, nothing this app needs handles pre-release tags
 * or build metadata.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function isVersionBelow(current: string, minimum: string): boolean {
  return compareVersions(current, minimum) < 0;
}

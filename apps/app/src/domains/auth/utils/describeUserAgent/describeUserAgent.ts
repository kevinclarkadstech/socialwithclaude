const browsers: [RegExp, string][] = [
  [/Edg\//, 'Edge'],
  [/OPR\//, 'Opera'],
  [/Firefox\//, 'Firefox'],
  [/Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];

const systems: [RegExp, string][] = [
  [/iPhone/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Android/, 'Android'],
  [/Mac OS X|Macintosh/, 'Mac'],
  [/Windows/, 'Windows'],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux'],
];

/** A device as people know it, e.g. "Chrome on Mac", from its user agent. Good enough to tell sessions apart, not exact. */
export function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) {
    return 'Unknown device';
  }
  const browser = browsers.find(([pattern]) => pattern.test(userAgent))?.[1];
  const system = systems.find(([pattern]) => pattern.test(userAgent))?.[1];
  if (browser && system) {
    return `${browser} on ${system}`;
  }
  return browser ?? system ?? 'Unknown device';
}

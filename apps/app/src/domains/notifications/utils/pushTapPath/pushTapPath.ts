/**
 * Where tapping a push notification goes: the `path` the API put in its
 * data, if it's one of the app's own routes ("/…", never another site or a
 * scheme like "javascript:"). Null for anything else.
 */
export function pushTapPath(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || !('path' in data)) {
    return null;
  }
  const { path } = data;
  return typeof path === 'string' && /^\/(?!\/)[^\s\\]*$/.test(path) ? path : null;
}

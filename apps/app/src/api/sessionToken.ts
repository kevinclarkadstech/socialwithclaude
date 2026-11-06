import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { isNativePlatform } from '../navigation';

const KEY = 'session-token';

/**
 * The session token, in the native app only. Browsers use the API's HttpOnly
 * cookie instead, which page scripts can't read. In the app the token lives in
 * the iOS Keychain / Android Keystore, and a copy is kept in memory so
 * requests can read it synchronously.
 */
let token: string | null = null;

export const sessionToken = {
  /** Reads the saved token. Call once before the app renders. */
  async load() {
    if (!isNativePlatform) {
      return;
    }
    const saved = await SecureStorage.get(KEY);
    token = typeof saved === 'string' ? saved : null;
  },
  get(): string | null {
    return token;
  },
  async set(value: string) {
    token = value;
    await SecureStorage.set(KEY, value);
  },
  async clear() {
    token = null;
    if (isNativePlatform) {
      await SecureStorage.remove(KEY);
    }
  },
};

/** The Authorization header for API requests: only in the native app, and only once signed in. */
export function authorizationHeader(): Record<string, string> {
  const value = isNativePlatform ? sessionToken.get() : null;
  return value ? { Authorization: `Bearer ${value}` } : {};
}

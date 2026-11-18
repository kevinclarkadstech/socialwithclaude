const KEY = 'sign-up-unavailable';

/**
 * Whether sign-up was refused on this device for being too young, so
 * changing the answer and trying again doesn't work (as the FTC suggests for
 * an age screen). Kept in the device's storage; if that's unavailable, it
 * only lasts until the app is closed.
 */
let blockedThisSession = false;

export const signUpBlock = {
  isBlocked(): boolean {
    if (blockedThisSession) {
      return true;
    }
    try {
      return localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  },
  block() {
    blockedThisSession = true;
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      // Storage is off (private browsing): blockedThisSession still holds until the app closes.
    }
  },
};

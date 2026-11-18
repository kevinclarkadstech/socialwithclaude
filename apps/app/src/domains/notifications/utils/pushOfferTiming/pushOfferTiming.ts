const KEY = 'push-offered-at';

/** How long after "Not now" the app waits before offering push notifications again. */
const offerAgainAfterMs = 30 * 24 * 60 * 60 * 1000;

/**
 * When this device was last offered push notifications (so "Not now" isn't
 * followed by the same question an hour later). Kept in the device's
 * storage; without it, the offer can come again next time the app opens.
 */
export const pushOfferTiming = {
  canOffer(now = Date.now()): boolean {
    try {
      const last = Number(localStorage.getItem(KEY));
      return !last || now - last >= offerAgainAfterMs;
    } catch {
      return true;
    }
  },
  offered(now = Date.now()) {
    try {
      localStorage.setItem(KEY, String(now));
    } catch {
      // Storage is off: it may be offered again next time.
    }
  },
};

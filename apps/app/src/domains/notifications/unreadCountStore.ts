import { canReadMyNotifications } from '@myapp/shared/domains';
import { getCallingUser } from '../users';
import { runGetUnreadNotificationCountQuery } from './operations/runGetUnreadNotificationCountQuery/runGetUnreadNotificationCountQuery';

/** How often the bell's number is checked while something shows it. */
const refreshEveryMs = 60_000;

let count = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function setCount(next: number) {
  if (next === count) {
    return;
  }
  count = next;
  for (const listener of listeners) {
    listener();
  }
}

/** Loads the number again: 0 when signed out (or mid sign-up). A failed load keeps the last number. */
export async function refreshUnreadNotificationCount() {
  const caller = await getCallingUser();
  if (!canReadMyNotifications({ caller }).ok) {
    setCount(0);
    return;
  }
  const result = await runGetUnreadNotificationCountQuery().catch(() => null);
  if (result?.ok) {
    setCount(result.value.count);
  }
}

function onVisible() {
  if (document.visibilityState === 'visible') {
    void refreshUnreadNotificationCount();
  }
}

/**
 * The number on the bell, shared by every header showing it. While at
 * least one is subscribed it's refreshed every minute and when the app comes
 * back to the foreground; opening Notifications sets it to 0.
 */
export const unreadCountStore = {
  get: () => count,
  set: setCount,
  subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1) {
      void refreshUnreadNotificationCount();
      timer = setInterval(() => void refreshUnreadNotificationCount(), refreshEveryMs);
      document.addEventListener('visibilitychange', onVisible);
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        if (timer) {
          clearInterval(timer);
        }
        timer = null;
        document.removeEventListener('visibilitychange', onVisible);
      }
    };
  },
};

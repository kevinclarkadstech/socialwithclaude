import { useEffect, useSyncExternalStore } from 'react';
import { useCallingUser } from '../../../users';
import { refreshUnreadNotificationCount, unreadCountStore } from '../../unreadCountStore';

/** The number on the bell, kept fresh (see unreadCountStore), and reloaded when who's signed in changes. */
export function useUnreadNotificationCount() {
  const count = useSyncExternalStore(unreadCountStore.subscribe, unreadCountStore.get);
  const { callingUser } = useCallingUser();
  const userId = callingUser?.userId ?? null;
  useEffect(() => {
    void refreshUnreadNotificationCount();
  }, [userId]);
  return count;
}

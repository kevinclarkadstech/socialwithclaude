import { useCallback, useEffect, useState } from 'react';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { onForeground } from '../../../../lib/foreground';
import { isNativePlatform } from '../../../../utils';

/** Whether this device lets the app show push notifications: "unavailable" in a browser. */
export type PushPermission = 'granted' | 'denied' | 'prompt' | 'unavailable' | 'loading';

async function readPermission(): Promise<PushPermission> {
  const { receive } = await FirebaseMessaging.checkPermissions().catch(() => ({ receive: 'denied' as const }));
  return receive === 'granted' ? 'granted' : receive === 'denied' ? 'denied' : 'prompt';
}

/**
 * This device's push permission, read again when the app comes back to the
 * foreground (they may have changed it in the phone's settings).
 */
export function usePushPermission() {
  const [permission, setPermission] = useState<PushPermission>(isNativePlatform ? 'loading' : 'unavailable');

  useEffect(() => {
    if (!isNativePlatform) {
      return;
    }
    let cancelled = false;
    const read = () => {
      void readPermission().then((read) => {
        if (!cancelled) {
          setPermission(read);
        }
      });
    };
    read();
    const stopListening = onForeground(read);
    return () => {
      cancelled = true;
      stopListening();
    };
  }, []);

  /** Reads it again now (e.g. after asking). */
  const refresh = useCallback(async () => {
    if (isNativePlatform) {
      setPermission(await readPermission());
    }
  }, []);

  return { permission, refresh };
}

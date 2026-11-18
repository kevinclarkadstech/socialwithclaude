/**
 * Stands in for the Firebase JS SDK's `firebase/messaging` (see the alias in
 * vite.config.ts). The push plugin only uses it in its web version, and the
 * app only uses push in the iOS and Android apps, where the native Firebase
 * SDKs do the work, so the SDK isn't installed. If this is ever reached,
 * push simply isn't supported.
 */
const unsupported = () => {
  throw new Error('Push notifications are only available in the iOS and Android apps');
};

export const isSupported = async () => false;
export const getMessaging = unsupported;
export const getToken = unsupported;
export const deleteToken = unsupported;
export const onMessage = unsupported;

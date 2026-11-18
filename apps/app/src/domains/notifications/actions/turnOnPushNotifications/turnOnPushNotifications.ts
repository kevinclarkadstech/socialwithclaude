import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { showNotice } from '../../../../lib/prompts';
import { registerThisDevice } from '../registerThisDevice/registerThisDevice';

/**
 * Turns on push notifications on this device from Settings: asks the
 * system (if it hasn't been asked), or, if they were turned off there,
 * says where to turn them back on. Whether they're on now.
 */
export async function turnOnPushNotifications(): Promise<boolean> {
  const { receive } = await FirebaseMessaging.checkPermissions();
  if (receive === 'denied') {
    await showNotice({
      header: 'Notifications are off',
      message: "They're turned off for this app in your phone's settings. Turn them on there, then come back.",
    });
    return false;
  }
  const result = receive === 'granted' ? { receive } : await FirebaseMessaging.requestPermissions();
  return result.receive === 'granted' && (await registerThisDevice());
}

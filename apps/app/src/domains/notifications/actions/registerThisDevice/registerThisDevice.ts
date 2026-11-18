import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { errorMessage } from '../../../../lib/api/errors';
import { logger } from '../../../../lib/logger';
import { isIOS, isNativePlatform } from '../../../../utils';
import { runRegisterPushTokenMutation } from '../../operations/runRegisterPushTokenMutation/runRegisterPushTokenMutation';

/**
 * If push notifications are allowed on this device, sends its Firebase token
 * to the API, so the signed-in user's notifications come here. Run when the
 * app starts (tokens change now and then) and once they're allowed. Does
 * nothing in a browser. Whether it registered; a failure is logged, not shown.
 */
export async function registerThisDevice(): Promise<boolean> {
  if (!isNativePlatform) {
    return false;
  }
  try {
    const { receive } = await FirebaseMessaging.checkPermissions();
    if (receive !== 'granted') {
      return false;
    }
    const { token } = await FirebaseMessaging.getToken();
    const result = await runRegisterPushTokenMutation({ token, platform: isIOS ? 'ios' : 'android' });
    return result.ok;
  } catch (error) {
    // E.g. Firebase isn't set up in this build (no google-services.json / GoogleService-Info.plist).
    logger.warn("Couldn't register this device for push notifications", { error: errorMessage(error) });
    return false;
  }
}

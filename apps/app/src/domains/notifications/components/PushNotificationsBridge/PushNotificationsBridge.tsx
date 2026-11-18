import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { replyExpected } from '../../../../common/events/replyExpected/replyExpected';
import { isNativePlatform } from '../../../../utils';
import { useCallingUser } from '../../../users';
import { offerPushNotifications } from '../../actions/offerPushNotifications/offerPushNotifications';
import { registerThisDevice } from '../../actions/registerThisDevice/registerThisDevice';
import { pushTapPath } from '../../utils/pushTapPath/pushTapPath';

/**
 * Connects the app to push notifications (native app only; renders
 * nothing): registers the device once someone has signed up (and again when
 * its token changes), opens the screen a tapped notification is about, and
 * offers to turn them on after something they'd want to hear back about
 * (see replyExpected). Rendered once, inside the router.
 */
export function PushNotificationsBridge() {
  const navigate = useNavigate();
  const { callingUser } = useCallingUser();
  const userId = callingUser?.profile ? callingUser.userId : null;

  useEffect(() => {
    if (!isNativePlatform || !userId) {
      return;
    }
    void registerThisDevice();
    const handles = [
      FirebaseMessaging.addListener('tokenReceived', () => void registerThisDevice()),
      FirebaseMessaging.addListener('notificationActionPerformed', ({ notification }) => {
        const path = pushTapPath(notification.data);
        if (path) {
          void navigate(path);
        }
      }),
    ];
    const unsubscribe = replyExpected.subscribe((reason) => void offerPushNotifications(reason));
    return () => {
      unsubscribe();
      for (const handle of handles) {
        void handle.then((listener) => listener.remove());
      }
    };
  }, [userId, navigate]);

  return null;
}

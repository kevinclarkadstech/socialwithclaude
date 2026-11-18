import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import type { ReplyExpectedReason } from '../../../../common/events/replyExpected/replyExpected';
import { askYesNo } from '../../../../lib/prompts';
import { isNativePlatform } from '../../../../utils';
import { pushOfferTiming } from '../../utils/pushOfferTiming/pushOfferTiming';
import { registerThisDevice } from '../registerThisDevice/registerThisDevice';

const why: Record<ReplyExpectedReason, string> = {
  message: 'Get a notification when they reply, even when the app is closed.',
  follow: 'Get a notification when they follow you back, comment or send you a message.',
  comment: 'Get a notification when someone replies, comments on your posts or sends you a message.',
};

/**
 * Offers to turn on push notifications just after they've done something
 * they'd want to hear back about, when the reason is obvious. It asks in
 * the app first: the system's own question can only be asked once (on
 * iOS), so it only comes after they've said yes here. Not again for 30
 * days after "Not now", and never once they've decided in the system's
 * question. Does nothing in a browser.
 */
export async function offerPushNotifications(reason: ReplyExpectedReason) {
  if (!isNativePlatform) {
    return;
  }
  const { receive } = await FirebaseMessaging.checkPermissions().catch(() => ({ receive: 'denied' as const }));
  if (receive === 'granted') {
    await registerThisDevice();
    return;
  }
  if (receive === 'denied' || !pushOfferTiming.canOffer()) {
    return;
  }
  pushOfferTiming.offered();
  const wantsThem = await askYesNo({ header: 'Turn on notifications?', message: why[reason], yesText: 'Turn on', noText: 'Not now' });
  if (!wantsThem) {
    return;
  }
  const requested = await FirebaseMessaging.requestPermissions().catch(() => ({ receive: 'denied' as const }));
  if (requested.receive === 'granted') {
    await registerThisDevice();
  }
}

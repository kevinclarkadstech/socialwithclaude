import { IonButton, IonItem, IonLabel, IonList, IonListHeader, IonNote, IonSpinner, IonToggle } from '@ionic/react';
import type { PushSetting } from '@myapp/shared/domains';
import { useMySettings } from '../../../users';
import { turnOnPushNotifications } from '../../actions/turnOnPushNotifications/turnOnPushNotifications';
import { usePushPermission } from '../../hooks/usePushPermission/usePushPermission';

const kinds: { setting: PushSetting; label: string }[] = [
  { setting: 'pushMessages', label: 'New messages' },
  { setting: 'pushComments', label: 'Comments on your posts' },
  { setting: 'pushMentions', label: 'Mentions' },
  { setting: 'pushFollows', label: 'New followers and follow requests' },
];

/**
 * Settings → Notifications: whether this device gets push notifications
 * (and a way to turn them on), and which kinds to push. The kinds apply to
 * every device they're signed in on; warnings and report outcomes always
 * come. Everything still shows under the bell either way.
 */
export function PushSettings() {
  const { settings, isFailed, isSaving, updateSettings } = useMySettings();
  const { permission, refresh } = usePushPermission();

  async function turnOn() {
    await turnOnPushNotifications();
    await refresh();
  }

  return (
    <IonList inset>
      <IonListHeader>Notifications</IonListHeader>
      {permission === 'unavailable' && (
        <IonItem lines="full">
          <IonNote className="ion-text-wrap">Push notifications come to the iOS and Android apps. Everything also shows under the bell.</IonNote>
        </IonItem>
      )}
      {(permission === 'prompt' || permission === 'denied') && (
        <IonItem lines="full">
          <IonLabel className="ion-text-wrap">
            <h3>Notifications are off on this device</h3>
            <p>{permission === 'denied' ? "They're turned off in your phone's settings." : 'Turn them on to hear about messages and replies.'}</p>
          </IonLabel>
          <IonButton slot="end" fill="clear" onClick={() => void turnOn()}>
            Turn on
          </IonButton>
        </IonItem>
      )}
      {!settings && !isFailed && (
        <IonItem lines="none">
          <IonSpinner />
        </IonItem>
      )}
      {isFailed && (
        <IonItem lines="none">
          <IonNote>Couldn't load your settings.</IonNote>
        </IonItem>
      )}
      {settings &&
        kinds.map(({ setting, label }) => (
          <IonItem key={setting} lines="none" data-push-setting={setting}>
            <IonToggle checked={settings[setting]} disabled={isSaving} onIonChange={(event) => void updateSettings({ [setting]: event.detail.checked })}>
              {label}
            </IonToggle>
          </IonItem>
        ))}
    </IonList>
  );
}

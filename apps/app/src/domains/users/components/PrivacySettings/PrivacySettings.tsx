import { IonItem, IonLabel, IonList, IonListHeader, IonNote, IonSpinner, IonToggle } from '@ionic/react';
import { canUpdateMySettings } from '@myapp/shared/domains';
import { disallowedActions } from '../../../../common/events/disallowedActions/disallowedActions';
import { useCallingUser } from '../../hooks/useCallingUser/useCallingUser';
import { useMySettings } from '../../hooks/useMySettings/useMySettings';

/** Who can see your profile: everyone, or only followers you've approved. */
export function PrivacySettings() {
  const { callingUser } = useCallingUser();
  const { settings, isFailed, isSaving, setProfileVisibility } = useMySettings();
  const updateCheck = canUpdateMySettings({ caller: callingUser });
  const isPrivate = settings?.profileVisibility === 'followers';

  function toggle(makePrivate: boolean) {
    const action = () => void setProfileVisibility(makePrivate ? 'followers' : 'public');
    if (!updateCheck.ok) {
      disallowedActions.emit({ error: updateCheck.error, action });
      return;
    }
    action();
  }

  return (
    <IonList inset>
      <IonListHeader>Privacy</IonListHeader>
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
      {settings && (
        <IonItem lines="none">
          <IonToggle
            checked={isPrivate}
            disabled={isSaving}
            onIonChange={(event) => toggle(event.detail.checked)}
          >
            <IonLabel className="ion-text-wrap">
              <h3>Private account</h3>
              <p>
                {isPrivate
                  ? 'Only followers you approve see your posts and listings.'
                  : 'Anyone can see your posts and listings, and follow you.'}
              </p>
            </IonLabel>
          </IonToggle>
        </IonItem>
      )}
    </IonList>
  );
}

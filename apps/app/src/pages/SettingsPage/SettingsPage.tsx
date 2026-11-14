import { IonButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { requireCallerWithProfile } from '@myapp/shared/authorization';
import { disallowedActions } from '../../common/events/disallowedActions/disallowedActions';
import { SessionList } from '../../domains/auth';
import { BlockedUserList, FollowRequestList, PrivacySettings, useCallingUser } from '../../domains/users';
import { BackButton } from '../../navigation';
import '../../common/styles/pages.css';

/** /settings, from your profile's menu: privacy, follow requests, where you're signed in, and who you've blocked. */
export function SettingsPage() {
  const { callingUser } = useCallingUser();
  const signedUpCheck = requireCallerWithProfile({ caller: callingUser });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <BackButton />
          </IonButtons>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent color="light">
        {signedUpCheck.ok ? (
          <>
            <PrivacySettings />
            <FollowRequestList />
            <SessionList />
            <BlockedUserList />
          </>
        ) : (
          <div className="page-message">
            <p>{callingUser ? 'Finish signing up to change your settings.' : 'Sign in to change your settings.'}</p>
            <IonButton onClick={() => disallowedActions.emit({ error: signedUpCheck.error })}>
              {callingUser ? 'Finish sign-up' : 'Sign in'}
            </IonButton>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}

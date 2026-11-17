import { IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { canModerate } from '@myapp/shared/domains';
import { useNavigate } from 'react-router';
import { requireCallerWithProfile } from '@myapp/shared/authorization';
import { disallowedActions } from '../../common/events/disallowedActions/disallowedActions';
import { SessionList } from '../../domains/auth';
import { BlockedUserList, FollowRequestList, PrivacySettings, useCallingUser } from '../../domains/users';
import { BackButton } from '../../navigation';
import '../../common/styles/pages.css';

/**
 * /settings, from your profile's menu: privacy, follow requests, where you're
 * signed in, and who you've blocked; for admins, a way into Moderation.
 */
export function SettingsPage() {
  const { callingUser } = useCallingUser();
  const signedUpCheck = requireCallerWithProfile({ caller: callingUser });
  const canModerateCheck = canModerate({ caller: callingUser });
  const navigate = useNavigate();

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
            {canModerateCheck.ok && (
              <IonList inset>
                <IonItem button detail onClick={() => navigate('/moderation')}>
                  <IonLabel>Moderation</IonLabel>
                </IonItem>
              </IonList>
            )}
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

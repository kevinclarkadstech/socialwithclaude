import { IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { canAdminister } from '@myapp/shared/domains';
import { useNavigate } from 'react-router';
import { requireCallerWithProfile } from '@myapp/shared/authorization';
import { contactEmail } from '../../common/brand';
import { disallowedActions } from '../../common/events/disallowedActions/disallowedActions';
import { SessionList } from '../../domains/auth';
import { PushSettings } from '../../domains/notifications';
import { BlockedUserList, FollowRequestList, PrivacySettings, useCallingUser } from '../../domains/users';
import { BackButton } from '../../navigation';
import '../../common/styles/pages.css';

/**
 * /settings, from your profile's menu: privacy, notifications, follow requests, where you're
 * signed in, and who you've blocked; for admins, a way into Admin;
 * deleting your account; the terms, privacy policy and child safety
 * standards; and how to contact us.
 */
export function SettingsPage() {
  const { callingUser } = useCallingUser();
  const signedUpCheck = requireCallerWithProfile({ caller: callingUser });
  const canAdministerCheck = canAdminister({ caller: callingUser });
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
            <PushSettings />
            <FollowRequestList />
            <SessionList />
            <BlockedUserList />
            {canAdministerCheck.ok && (
              <IonList inset>
                <IonItem button detail onClick={() => navigate('/admin')}>
                  <IonLabel>Admin</IonLabel>
                </IonItem>
              </IonList>
            )}
            <DeleteAccountItem />
          </>
        ) : (
          <div className="page-message">
            <p>{callingUser ? 'Finish signing up to change your settings.' : 'Sign in to change your settings.'}</p>
            <IonButton onClick={() => disallowedActions.emit({ error: signedUpCheck.error })}>
              {callingUser ? 'Finish sign-up' : 'Sign in'}
            </IonButton>
          </div>
        )}
        {/* Someone who never finished sign-up can still delete the account they made. */}
        {!signedUpCheck.ok && callingUser && <DeleteAccountItem />}
        <IonList inset>
          <IonItem button detail onClick={() => navigate('/terms')}>
            <IonLabel>Terms of Service</IonLabel>
          </IonItem>
          <IonItem button detail onClick={() => navigate('/privacy')}>
            <IonLabel>Privacy Policy</IonLabel>
          </IonItem>
          <IonItem button detail onClick={() => navigate('/child-safety')}>
            <IonLabel>Child safety</IonLabel>
          </IonItem>
          <IonItem href={`mailto:${contactEmail}`} detail>
            <IonLabel>
              Contact us
              <p>{contactEmail}</p>
            </IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
}

/** The way to Delete account, last on the page. */
function DeleteAccountItem() {
  const navigate = useNavigate();
  return (
    <IonList inset>
      <IonItem button detail onClick={() => navigate('/settings/delete-account')}>
        <IonLabel color="danger">Delete account</IonLabel>
      </IonItem>
    </IonList>
  );
}

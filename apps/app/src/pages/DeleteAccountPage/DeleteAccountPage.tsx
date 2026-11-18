import { IonButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { requireCaller } from '@myapp/shared/authorization';
import { useNavigate } from 'react-router';
import { disallowedActions } from '../../common/events/disallowedActions/disallowedActions';
import { DeleteAccountForm } from '../../domains/auth';
import { useCallingUser } from '../../domains/users';
import { BackButton } from '../../navigation';
import '../../common/styles/pages.css';

/**
 * /settings/delete-account, from Settings, and /delete-account, the public
 * address for deletion requests (Google Play asks for one that works without
 * the app): what deleting your account does, and doing it. Signed out, it
 * asks you to sign in first.
 */
export function DeleteAccountPage() {
  const { callingUser } = useCallingUser();
  const navigate = useNavigate();
  const signedInCheck = requireCaller({ caller: callingUser });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <BackButton />
          </IonButtons>
          <IonTitle>Delete account</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {callingUser ? (
          <DeleteAccountForm email={callingUser.email} onDeleted={() => navigate('/feed', { replace: true })} />
        ) : (
          <div className="page-message">
            <p>To delete your account, sign in with the email address you use for it.</p>
            {!signedInCheck.ok && <IonButton onClick={() => disallowedActions.emit({ error: signedInCheck.error })}>Sign in</IonButton>}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}

import { IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { DeleteAccountForm } from '../../domains/auth';
import { useCallingUser } from '../../domains/users';
import { BackButton } from '../../navigation';
import '../../common/styles/pages.css';

/** /settings/delete-account, from Settings: what deleting your account does, and doing it. */
export function DeleteAccountPage() {
  const { callingUser } = useCallingUser();

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
          <DeleteAccountForm email={callingUser.email} />
        ) : (
          <div className="page-message">
            <p>Sign in to delete your account.</p>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}

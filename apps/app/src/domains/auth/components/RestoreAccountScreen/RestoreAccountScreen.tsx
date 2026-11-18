import { useState } from 'react';
import { accountDeletesAt } from '@myapp/shared/domains';
import { IonButton, IonContent, IonHeader, IonPage, IonText, IonTitle, IonToolbar } from '@ionic/react';
import { errorMessage } from '../../../../lib/api/errors';
import { showToast } from '../../../../lib/toasts';
import { refreshCallingUser } from '../../../users';
import { useAuth } from '../../hooks/useAuth/useAuth';
import { runRestoreAccountMutation } from '../../operations/runRestoreAccountMutation/runRestoreAccountMutation';
import { longDate } from '../../../../utils/formatters/dates';
import '../../../../common/styles/modal-form.css';
import './RestoreAccountScreen.css';

/**
 * In place of the whole app while the signed-in account is scheduled for
 * deletion: the API refuses everything else, so the only choices are to
 * restore it or sign out.
 */
export function RestoreAccountScreen({ deletionScheduledAt }: { deletionScheduledAt: string }) {
  const { signOut } = useAuth();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function restore() {
    setIsBusy(true);
    setError(null);
    try {
      const result = await runRestoreAccountMutation();
      if (!result.ok) {
        setError(result.error.message ?? "Couldn't restore your account. Try again.");
        return;
      }
      await refreshCallingUser();
      void showToast('Your account is restored');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Your account is being deleted</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="modal-form restore-account">
          <p>
            You asked to delete your account. It's hidden from everyone, and it will be deleted for good on{' '}
            <strong>{longDate(accountDeletesAt(new Date(deletionScheduledAt)).toISOString())}</strong>.
          </p>
          <p>Restore it to keep everything and carry on where you left off.</p>
          <IonButton expand="block" disabled={isBusy} onClick={() => void restore()}>
            Restore my account
          </IonButton>
          <IonButton expand="block" fill="clear" disabled={isBusy} onClick={() => void signOut()}>
            Sign out
          </IonButton>
          {error && (
            <IonText className="modal-form-error" color="danger" role="alert">
              <p>{error}</p>
            </IonText>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

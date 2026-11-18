import { useState } from 'react';
import { IonButton, IonContent, IonHeader, IonPage, IonText, IonTitle, IonToolbar } from '@ionic/react';
import { currentTermsVersion } from '@myapp/shared/domains';
import { errorMessage } from '../../../../lib/api/errors';
import { callingUserStore, useCallingUser } from '../../../users';
import { DeleteAccountForm, useAuth } from '../../../auth';
import { runAcceptTermsMutation } from '../../operations/runAcceptTermsMutation/runAcceptTermsMutation';
import { TermsAgreement } from '../TermsAgreement/TermsAgreement';
import '../../../../common/styles/modal-form.css';
import './UpdatedTermsScreen.css';

/**
 * In place of the app when the terms have changed in a way that needs
 * agreeing to again (a new major version, see needsToAcceptTerms): agree to
 * carry on, sign out, or delete the account instead.
 */
export function UpdatedTermsScreen() {
  const { signOut } = useAuth();
  const { callingUser } = useCallingUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setIsBusy(true);
    setError(null);
    try {
      const result = await runAcceptTermsMutation({ version: currentTermsVersion });
      if (!result.ok) {
        setError(result.error.message ?? "Couldn't save that. Try again.");
        return;
      }
      const { callingUser } = callingUserStore.get();
      if (callingUser) {
        callingUserStore.set({ ...callingUser, termsAcceptedVersion: result.value.termsAcceptedVersion });
      }
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
          <IonTitle>We've updated our terms</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="modal-form updated-terms">
          <p>Our Terms of Service and Privacy Policy have changed. Please read them and agree to keep using the app.</p>
          <TermsAgreement checked={agreed} onChange={setAgreed} />
          <IonButton expand="block" disabled={!agreed || isBusy} onClick={() => void accept()}>
            Continue
          </IonButton>
          <IonButton expand="block" fill="clear" disabled={isBusy} onClick={() => void signOut()}>
            Sign out
          </IonButton>
          {!isDeleting && (
            <IonButton expand="block" fill="clear" color="danger" disabled={isBusy} onClick={() => setIsDeleting(true)}>
              Delete my account instead
            </IonButton>
          )}
          {error && (
            <IonText className="modal-form-error" color="danger" role="alert">
              <p>{error}</p>
            </IonText>
          )}
        </div>
        {isDeleting && callingUser && (
          <div className="updated-terms__delete">
            <DeleteAccountForm email={callingUser.email} />
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}

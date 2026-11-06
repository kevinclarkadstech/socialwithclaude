import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonModal,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import type { FormEvent } from 'react';
import { useSignInFlow } from './useSignInFlow';
import '../modal-form.css';

interface SignInModalProps {
  isOpen: boolean;
  /** Signed in. (A new account then goes through onboarding.) */
  onSignedIn: () => void;
  onCancel: () => void;
  onDidDismiss: () => void;
}

/** Sign in with an emailed code. Renders the steps of useSignInFlow. */
export function SignInModal({ isOpen, onSignedIn, onCancel, onDidDismiss }: SignInModalProps) {
  const flow = useSignInFlow({ onSignedIn });

  const submit = (action: () => void) => (event: FormEvent) => {
    event.preventDefault();
    action();
  };

  return (
    <IonModal isOpen={isOpen} onWillPresent={flow.start} onDidDismiss={onDidDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Sign in</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onCancel}>Cancel</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {flow.step === 'email' && (
          <form className="modal-form" onSubmit={submit(flow.submitEmail)}>
            <p>We'll email you a code to sign in. New here? This creates your account.</p>
            <IonInput
              label="Email"
              labelPlacement="stacked"
              fill="outline"
              type="email"
              autocomplete="email"
              inputmode="email"
              required
              value={flow.email}
              onIonInput={(event) => flow.setEmail(event.detail.value ?? '')}
            />
            <IonButton type="submit" expand="block" disabled={flow.isBusy || !flow.normalizedEmail}>
              Send code
            </IonButton>
          </form>
        )}

        {flow.step === 'code' && (
          <form className="modal-form" onSubmit={submit(flow.submitCode)}>
            <p>
              Enter the 6-digit code sent to <strong>{flow.normalizedEmail}</strong>.
            </p>
            <IonInput
              label="Code"
              labelPlacement="stacked"
              fill="outline"
              autocomplete="one-time-code"
              inputmode="numeric"
              maxlength={6}
              required
              value={flow.code}
              onIonInput={(event) => flow.setCode(event.detail.value ?? '')}
            />
            <IonButton type="submit" expand="block" disabled={flow.isBusy || flow.code.trim().length !== 6}>
              Sign in
            </IonButton>
            <IonButton fill="clear" size="small" disabled={flow.isBusy} onClick={flow.resendCode}>
              Send a new code
            </IonButton>
            <IonButton fill="clear" size="small" disabled={flow.isBusy} onClick={flow.changeEmail}>
              Use a different email
            </IonButton>
          </form>
        )}

        {flow.error && (
          <IonText className="modal-form-error" color="danger" role="alert">
            <p>{flow.error}</p>
          </IonText>
        )}
      </IonContent>
    </IonModal>
  );
}

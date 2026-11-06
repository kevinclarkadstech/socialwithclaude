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
import './SignInModal.css';

interface SignInModalProps {
  isOpen: boolean;
  /** Signed in and signed up. */
  onDone: () => void;
  onCancel: () => void;
}

/** Sign in with an emailed code. Renders the steps of useSignInFlow. */
export function SignInModal({ isOpen, onDone, onCancel }: SignInModalProps) {
  const flow = useSignInFlow({ onDone });

  const submit = (action: () => void) => (event: FormEvent) => {
    event.preventDefault();
    action();
  };

  return (
    <IonModal isOpen={isOpen} onWillPresent={flow.start} onDidDismiss={onCancel}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{flow.step === 'profile' ? 'Choose a username' : 'Sign in'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onCancel}>Cancel</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {flow.step === 'email' && (
          <form className="sign-in-form" onSubmit={submit(flow.submitEmail)}>
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
          <form className="sign-in-form" onSubmit={submit(flow.submitCode)}>
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

        {flow.step === 'profile' && (
          <form className="sign-in-form" onSubmit={submit(flow.submitProfile)}>
            <p>Pick the name people will find you by. You can add more to your profile later.</p>
            <IonInput
              label="Username"
              labelPlacement="stacked"
              fill="outline"
              autocapitalize="off"
              autocomplete="username"
              helperText="3–30 lowercase letters, numbers and underscores"
              required
              value={flow.username}
              onIonInput={(event) => flow.setUsername(event.detail.value ?? '')}
            />
            <IonInput
              label="First name (optional)"
              labelPlacement="stacked"
              fill="outline"
              autocomplete="given-name"
              value={flow.firstName}
              onIonInput={(event) => flow.setFirstName(event.detail.value ?? '')}
            />
            <IonInput
              label="Last name (optional)"
              labelPlacement="stacked"
              fill="outline"
              autocomplete="family-name"
              value={flow.lastName}
              onIonInput={(event) => flow.setLastName(event.detail.value ?? '')}
            />
            <IonButton type="submit" expand="block" disabled={flow.isBusy || !flow.username}>
              Continue
            </IonButton>
          </form>
        )}

        {flow.error && (
          <IonText className="sign-in-error" color="danger" role="alert">
            <p>{flow.error}</p>
          </IonText>
        )}
      </IonContent>
    </IonModal>
  );
}

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
import { useOnboardingFlow } from '../../hooks/useOnboardingFlow/useOnboardingFlow';
import '../../../../common/styles/modal-form.css';

interface OnboardingModalProps {
  isOpen: boolean;
  /** The profile exists: sign-up is finished. */
  onDone: () => void;
  onCancel: () => void;
  onDidDismiss: () => void;
}

/** Finishing sign-up after the first sign-in: a username, and optionally a name. */
export function OnboardingModal({ isOpen, onDone, onCancel, onDidDismiss }: OnboardingModalProps) {
  const flow = useOnboardingFlow({ onDone });

  function submit(event: FormEvent) {
    event.preventDefault();
    flow.submit();
  }

  return (
    <IonModal isOpen={isOpen} onWillPresent={flow.reset} onDidDismiss={onDidDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Choose a username</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onCancel}>Later</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <form className="modal-form" onSubmit={submit}>
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
          {flow.error && (
            <IonText className="modal-form-error" color="danger" role="alert">
              <p>{flow.error}</p>
            </IonText>
          )}
        </form>
      </IonContent>
    </IonModal>
  );
}

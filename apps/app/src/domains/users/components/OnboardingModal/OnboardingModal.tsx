import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { appName } from '../../../../common/brand';
import type { FormEvent } from 'react';
import { TermsAgreement } from '../../../legal';
import { useOnboardingFlow } from '../../hooks/useOnboardingFlow/useOnboardingFlow';
import '../../../../common/styles/modal-form.css';
import './OnboardingModal.css';

interface OnboardingModalProps {
  isOpen: boolean;
  /** The profile exists: sign-up is finished. */
  onDone: () => void;
  onCancel: () => void;
  onDidDismiss: () => void;
}

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const thisYear = new Date().getFullYear();
// Every year someone could be born in, newest first (the API checks the age; the list doesn't hint at it).
const years = Array.from({ length: 120 }, (_, index) => thisYear - index);

/**
 * Finishing sign-up after the first sign-in: a username, optionally a name,
 * a birth month and year, and agreeing to the terms. Someone too young is
 * told they can't use the app instead (and the device remembers it).
 */
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
          <IonTitle>{flow.isBlocked ? 'Sign up' : 'Choose a username'}</IonTitle>
          {!flow.isBlocked && (
            <IonButtons slot="end">
              <IonButton onClick={onCancel}>Later</IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {flow.isBlocked ? (
          <div className="modal-form">
            <p>Sorry, you can't use {appName}.</p>
            <IonButton expand="block" onClick={() => flow.leave(onCancel)}>
              OK
            </IonButton>
          </div>
        ) : (
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
            <fieldset className="onboarding-birth">
              <legend>When were you born?</legend>
              <div className="onboarding-birth__fields">
                <IonSelect
                  label="Month"
                  labelPlacement="stacked"
                  fill="outline"
                  interface="action-sheet"
                  placeholder="Month"
                  value={flow.birthMonth}
                  onIonChange={(event) => flow.setBirthMonth(event.detail.value as number)}
                >
                  {months.map((month, index) => (
                    <IonSelectOption key={month} value={index + 1}>
                      {month}
                    </IonSelectOption>
                  ))}
                </IonSelect>
                <IonSelect
                  label="Year"
                  labelPlacement="stacked"
                  fill="outline"
                  interface="action-sheet"
                  placeholder="Year"
                  value={flow.birthYear}
                  onIonChange={(event) => flow.setBirthYear(event.detail.value as number)}
                >
                  {years.map((year) => (
                    <IonSelectOption key={year} value={year}>
                      {year}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </div>
              <p className="onboarding-birth__note">We ask so the app is right for your age. It isn't shown on your profile.</p>
            </fieldset>
            <TermsAgreement checked={flow.agreedToTerms} onChange={flow.setAgreedToTerms} />
            <IonButton type="submit" expand="block" disabled={flow.isBusy || !flow.username || flow.birthMonth === null || flow.birthYear === null || !flow.agreedToTerms}>
              Continue
            </IonButton>
            {flow.error && (
              <IonText className="modal-form-error" color="danger" role="alert">
                <p>{flow.error}</p>
              </IonText>
            )}
          </form>
        )}
      </IonContent>
    </IonModal>
  );
}

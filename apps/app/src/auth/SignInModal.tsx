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
import { UserProfileSchema } from '@myapp/shared/domains';
import { useEffect, useState, type FormEvent } from 'react';
import { getCallingUser, useCallingUser } from '../hooks/useCallingUser';
import { useSignIn, type SignInError } from '../hooks/useSignIn';
import './SignInModal.css';

type Step = 'email' | 'code' | 'profile';

interface SignInModalProps {
  isOpen: boolean;
  /** Signed in and signed up. */
  onDone: () => void;
  onCancel: () => void;
}

/**
 * Sign in with an emailed code: email, then the 6-digit code, then (for a
 * new account) a username. Someone signed in who hasn't chosen a username
 * starts at that step.
 */
export function SignInModal({ isOpen, onDone, onCancel }: SignInModalProps) {
  const { callingUser } = useCallingUser();
  const { sendCode, verifyCode, createProfile } = useSignIn();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [error, setError] = useState<SignInError>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(callingUser && !callingUser.profile ? 'profile' : 'email');
      setCode('');
      setError(null);
    }
    // Only when the modal opens: signing in during the code step changes callingUser.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function run(work: () => Promise<SignInError>, next?: () => void) {
    setIsBusy(true);
    setError(null);
    try {
      const failure = await work();
      if (failure) {
        setError(failure);
      } else {
        next?.();
      }
    } finally {
      setIsBusy(false);
    }
  }

  function submitEmail(event: FormEvent) {
    event.preventDefault();
    void run(() => sendCode(email.trim()), () => setStep('code'));
  }

  function submitCode(event: FormEvent) {
    event.preventDefault();
    void run(
      () => verifyCode(email.trim(), code.trim()),
      async () => {
        // A new account has no profile yet: it still needs a username.
        const signedIn = await getCallingUser();
        if (signedIn?.profile) {
          onDone();
        } else {
          setStep('profile');
        }
      },
    );
  }

  function submitProfile(event: FormEvent) {
    event.preventDefault();
    const checked = UserProfileSchema.shape.username.safeParse(username.trim());
    if (!checked.success) {
      setError(checked.error.issues[0]?.message ?? 'Choose a different username');
      return;
    }
    void run(
      () =>
        createProfile({
          username: checked.data,
          firstName: firstName.trim() || null,
          lastName: null,
          about: null,
        }),
      onDone,
    );
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onCancel}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{step === 'profile' ? 'Choose a username' : 'Sign in'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onCancel}>Cancel</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {step === 'email' && (
          <form className="sign-in-form" onSubmit={submitEmail}>
            <p>We'll email you a code to sign in. New here? This creates your account.</p>
            <IonInput
              label="Email"
              labelPlacement="stacked"
              fill="outline"
              type="email"
              autocomplete="email"
              inputmode="email"
              required
              value={email}
              onIonInput={(event) => setEmail(event.detail.value ?? '')}
            />
            <IonButton type="submit" expand="block" disabled={isBusy || !email.trim()}>
              Send code
            </IonButton>
          </form>
        )}

        {step === 'code' && (
          <form className="sign-in-form" onSubmit={submitCode}>
            <p>
              Enter the 6-digit code sent to <strong>{email}</strong>.
            </p>
            <IonInput
              label="Code"
              labelPlacement="stacked"
              fill="outline"
              autocomplete="one-time-code"
              inputmode="numeric"
              maxlength={6}
              required
              value={code}
              onIonInput={(event) => setCode(event.detail.value ?? '')}
            />
            <IonButton type="submit" expand="block" disabled={isBusy || code.trim().length !== 6}>
              Sign in
            </IonButton>
            <IonButton fill="clear" size="small" disabled={isBusy} onClick={() => void run(() => sendCode(email.trim()))}>
              Send a new code
            </IonButton>
            <IonButton fill="clear" size="small" disabled={isBusy} onClick={() => setStep('email')}>
              Use a different email
            </IonButton>
          </form>
        )}

        {step === 'profile' && (
          <form className="sign-in-form" onSubmit={submitProfile}>
            <p>Pick the name people will find you by. You can add more to your profile later.</p>
            <IonInput
              label="Username"
              labelPlacement="stacked"
              fill="outline"
              autocapitalize="off"
              autocomplete="username"
              helperText="3–30 letters, numbers and underscores"
              required
              value={username}
              onIonInput={(event) => setUsername(event.detail.value ?? '')}
            />
            <IonInput
              label="First name (optional)"
              labelPlacement="stacked"
              fill="outline"
              autocomplete="given-name"
              value={firstName}
              onIonInput={(event) => setFirstName(event.detail.value ?? '')}
            />
            <IonButton type="submit" expand="block" disabled={isBusy || !username.trim()}>
              Continue
            </IonButton>
          </form>
        )}

        {error && (
          <IonText className="sign-in-error" color="danger" role="alert">
            <p>{error}</p>
          </IonText>
        )}
      </IonContent>
    </IonModal>
  );
}

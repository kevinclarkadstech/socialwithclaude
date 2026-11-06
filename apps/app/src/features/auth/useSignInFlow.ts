import { UserProfileSchema } from '@myapp/shared/domains';
import { useState } from 'react';
import { callingUserStore } from '../../domains/users/callingUserStore';
import { useCreateProfile } from '../../domains/users/hooks/useCreateProfile';
import { useAuth } from '../../domains/auth/hooks/useAuth';

export type SignInStep = 'email' | 'code' | 'profile';

/**
 * The sign-in modal's flow: email, then the 6-digit code, then choosing a
 * username for a new account. Holds everything the modal shows, so the modal
 * only renders it.
 */
export function useSignInFlow({ onDone }: { onDone: () => void }) {
  const { sendCode, verifyCode } = useAuth();
  const { createProfile } = useCreateProfile();
  const [step, setStep] = useState<SignInStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // better-auth lowercases emails too; doing it here keeps what's shown and what's sent the same.
  const normalizedEmail = email.trim().toLowerCase();

  /** Runs a step's work: shows its failure message, or moves on. */
  async function run(work: () => Promise<string | null>, next?: () => void) {
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

  /** Starts over when the modal opens. Someone signed in without a username starts at that step. */
  function start() {
    const { callingUser } = callingUserStore.get();
    setStep(callingUser && !callingUser.profile ? 'profile' : 'email');
    setCode('');
    setError(null);
  }

  function submitEmail() {
    void run(() => sendCode(normalizedEmail), () => setStep('code'));
  }

  function resendCode() {
    void run(() => sendCode(normalizedEmail));
  }

  function changeEmail() {
    setCode('');
    setError(null);
    setStep('email');
  }

  function submitCode() {
    void run(
      () => verifyCode(normalizedEmail, code.trim()),
      () => {
        // A new account has no profile yet: it still needs a username.
        if (callingUserStore.get().callingUser?.profile) {
          onDone();
        } else {
          setStep('profile');
        }
      },
    );
  }

  function submitProfile() {
    const checked = UserProfileSchema.shape.username.safeParse(username);
    if (!checked.success) {
      setError(checked.error.issues[0]?.message ?? 'Choose a different username');
      return;
    }
    void run(
      () =>
        createProfile({
          username: checked.data,
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          about: null,
        }),
      onDone,
    );
  }

  return {
    step,
    email,
    normalizedEmail,
    code,
    username,
    firstName,
    lastName,
    error,
    isBusy,
    setEmail,
    setCode,
    // Usernames are lowercase; show it that way as it's typed.
    setUsername: (value: string) => setUsername(value.toLowerCase()),
    setFirstName,
    setLastName,
    start,
    submitEmail,
    resendCode,
    changeEmail,
    submitCode,
    submitProfile,
  };
}

import { useState } from 'react';
import { useAuth } from '../../domains/auth/hooks/useAuth';

export type SignInStep = 'email' | 'code';

/**
 * The sign-in modal's flow: email, then the 6-digit code. Holds everything
 * the modal shows, so the modal only renders it. Choosing a username for a
 * new account is onboarding's job, after this modal closes.
 */
export function useSignInFlow({ onSignedIn }: { onSignedIn: () => void }) {
  const { sendCode, verifyCode } = useAuth();
  const [step, setStep] = useState<SignInStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
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

  /** Starts over when the modal opens. */
  function start() {
    setStep('email');
    setCode('');
    setError(null);
  }

  return {
    step,
    email,
    normalizedEmail,
    code,
    error,
    isBusy,
    setEmail,
    setCode,
    start,
    submitEmail: () => void run(() => sendCode(normalizedEmail), () => setStep('code')),
    resendCode: () => void run(() => sendCode(normalizedEmail)),
    changeEmail: () => {
      setCode('');
      setError(null);
      setStep('email');
    },
    submitCode: () => void run(() => verifyCode(normalizedEmail, code.trim()), onSignedIn),
  };
}

import { currentTermsVersion, UserProfileSchema } from '@myapp/shared/domains';
import { useState } from 'react';
import { useCreateProfile } from '../useCreateProfile/useCreateProfile';
import { signUpBlock } from '../../utils/signUpBlock/signUpBlock';
import { sessionToken } from '../../../../lib/auth/sessionToken';
import { callingUserStore } from '../../callingUserStore';
import { runDeleteUnfinishedAccountMutation } from '../../operations/runDeleteUnfinishedAccountMutation/runDeleteUnfinishedAccountMutation';

/**
 * The onboarding modal's flow: choosing a username (and optionally a name),
 * giving a birth month and year, and agreeing to the terms finishes sign-up.
 * Someone too young is told they can't use the app, and this device won't
 * offer sign-up again (signUpBlock). Holds everything the modal shows.
 */
export function useOnboardingFlow({ onDone }: { onDone: () => void }) {
  const { createProfile } = useCreateProfile();
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [birthMonth, setBirthMonth] = useState<number | null>(null);
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [isBlocked, setIsBlocked] = useState(() => signUpBlock.isBlocked());
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function submit() {
    const checked = UserProfileSchema.shape.username.safeParse(username);
    if (!checked.success) {
      setError(checked.error.issues[0]?.message ?? 'Choose a different username');
      return;
    }
    if (birthMonth === null || birthYear === null) {
      setError('Enter the month and year you were born');
      return;
    }
    if (!agreedToTerms) {
      setError('Agree to the Terms of Service and Privacy Policy to continue');
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      const outcome = await createProfile({
        username: checked.data,
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        about: null,
        acceptedTermsVersion: currentTermsVersion,
        birthYear,
        birthMonth,
      });
      if (outcome.kind === 'too-young') {
        signUpBlock.block();
        setIsBlocked(true);
      } else if (outcome.kind === 'error') {
        setError(outcome.message);
      } else {
        onDone();
      }
    } finally {
      setIsBusy(false);
    }
  }

  /**
   * On a device where sign-up was refused for age: deletes the account just
   * signed in to (it has nothing in it yet) and signs out, then `onLeft`.
   */
  async function leave(onLeft: () => void) {
    if (callingUserStore.get().callingUser) {
      await runDeleteUnfinishedAccountMutation().catch(() => null);
      await sessionToken.clear();
      callingUserStore.set(null);
    }
    onLeft();
  }

  return {
    username,
    firstName,
    lastName,
    agreedToTerms,
    birthMonth,
    birthYear,
    isBlocked,
    error,
    isBusy,
    // Usernames are lowercase; show it that way as it's typed.
    setUsername: (value: string) => setUsername(value.toLowerCase()),
    setFirstName,
    setLastName,
    setAgreedToTerms,
    setBirthMonth,
    setBirthYear,
    reset: () => {
      setError(null);
      setIsBlocked(signUpBlock.isBlocked());
    },
    submit: () => void submit(),
    leave: (onLeft: () => void) => void leave(onLeft),
  };
}

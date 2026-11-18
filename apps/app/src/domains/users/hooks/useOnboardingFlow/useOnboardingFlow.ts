import { currentTermsVersion, UserProfileSchema } from '@myapp/shared/domains';
import { useState } from 'react';
import { useCreateProfile } from '../useCreateProfile/useCreateProfile';

/**
 * The onboarding modal's flow: choosing a username (and optionally a name)
 * and agreeing to the terms finishes sign-up. Holds everything the modal shows.
 */
export function useOnboardingFlow({ onDone }: { onDone: () => void }) {
  const { createProfile } = useCreateProfile();
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function submit() {
    const checked = UserProfileSchema.shape.username.safeParse(username);
    if (!checked.success) {
      setError(checked.error.issues[0]?.message ?? 'Choose a different username');
      return;
    }
    if (!agreedToTerms) {
      setError('Agree to the Terms of Service and Privacy Policy to continue');
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      const failure = await createProfile({
        username: checked.data,
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        about: null,
        acceptedTermsVersion: currentTermsVersion,
      });
      if (failure) {
        setError(failure);
      } else {
        onDone();
      }
    } finally {
      setIsBusy(false);
    }
  }

  return {
    username,
    firstName,
    lastName,
    agreedToTerms,
    error,
    isBusy,
    // Usernames are lowercase; show it that way as it's typed.
    setUsername: (value: string) => setUsername(value.toLowerCase()),
    setFirstName,
    setLastName,
    setAgreedToTerms,
    reset: () => setError(null),
    submit: () => void submit(),
  };
}

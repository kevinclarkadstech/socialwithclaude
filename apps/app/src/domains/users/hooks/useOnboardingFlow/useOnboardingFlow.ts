import { UserProfileSchema } from '@myapp/shared/domains';
import { useState } from 'react';
import { useCreateProfile } from '../useCreateProfile/useCreateProfile';

/**
 * The onboarding modal's flow: choosing a username (and optionally a name)
 * finishes sign-up. Holds everything the modal shows.
 */
export function useOnboardingFlow({ onDone }: { onDone: () => void }) {
  const { createProfile } = useCreateProfile();
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function submit() {
    const checked = UserProfileSchema.shape.username.safeParse(username);
    if (!checked.success) {
      setError(checked.error.issues[0]?.message ?? 'Choose a different username');
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
    error,
    isBusy,
    // Usernames are lowercase; show it that way as it's typed.
    setUsername: (value: string) => setUsername(value.toLowerCase()),
    setFirstName,
    setLastName,
    reset: () => setError(null),
    submit: () => void submit(),
  };
}

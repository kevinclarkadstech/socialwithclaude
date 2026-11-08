import { UpdateMyProfileMutationInputSchema, type UserProfile } from '@myapp/shared/domains';
import { useState } from 'react';
import { errorMessage } from '../../../lib/api/errors';
import { showErrorToast } from '../../../lib/toasts';
import { callingUserStore } from '../callingUserStore';
import { runUpdateMyProfileMutation } from '../operations/runUpdateMyProfileMutation';

/** What's wrong with the form, by field. */
interface EditProfileErrors {
  username?: string;
  firstName?: string;
  lastName?: string;
  about?: string;
}

/** Empty text means "not given". */
const orNull = (text: string) => (text.trim() === '' ? null : text.trim());

/**
 * Editing your profile: username, name and about, as typed; checking them
 * against the shared schema; and saving. A taken username shows by its field.
 */
export function useEditProfile({ onSaved }: { onSaved: (profile: UserProfile) => void }) {
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [about, setAbout] = useState('');
  const [errors, setErrors] = useState<EditProfileErrors>({});
  const [isBusy, setIsBusy] = useState(false);

  /** Starts from the signed-in user's profile. */
  function reset() {
    const profile = callingUserStore.get().callingUser?.profile;
    setUsername(profile?.username ?? '');
    setFirstName(profile?.firstName ?? '');
    setLastName(profile?.lastName ?? '');
    setAbout(profile?.about ?? '');
    setErrors({});
  }

  /** A field's error goes as soon as it's changed. */
  function clearError(field: keyof EditProfileErrors) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submit() {
    const parsed = UpdateMyProfileMutationInputSchema.safeParse({
      username,
      firstName: orNull(firstName),
      lastName: orNull(lastName),
      about: orNull(about),
    });
    if (!parsed.success) {
      const formErrors: EditProfileErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof EditProfileErrors;
        formErrors[field] ??= issue.message;
      }
      setErrors(formErrors);
      return;
    }

    setIsBusy(true);
    try {
      const result = await runUpdateMyProfileMutation(parsed.data);
      if (!result.ok) {
        if (result.error.type === 'conflict') {
          setErrors({ username: result.error.message ?? 'Username is taken' });
          return;
        }
        void showErrorToast(result.error.message ?? "Couldn't save your profile");
        return;
      }
      const { callingUser } = callingUserStore.get();
      if (callingUser) {
        callingUserStore.set({ ...callingUser, profile: result.value });
      }
      onSaved(result.value);
    } catch (error) {
      void showErrorToast(errorMessage(error));
    } finally {
      setIsBusy(false);
    }
  }

  return {
    fields: { username, firstName, lastName, about },
    set: {
      setUsername: (value: string) => {
        setUsername(value);
        clearError('username');
      },
      setFirstName: (value: string) => {
        setFirstName(value);
        clearError('firstName');
      },
      setLastName: (value: string) => {
        setLastName(value);
        clearError('lastName');
      },
      setAbout: (value: string) => {
        setAbout(value);
        clearError('about');
      },
    },
    errors,
    isBusy,
    reset,
    submit,
  };
}

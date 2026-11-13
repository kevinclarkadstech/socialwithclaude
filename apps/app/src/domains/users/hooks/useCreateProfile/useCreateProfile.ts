import type { CreateUserProfileMutationInput } from '@myapp/shared/domains';
import { apiErrorCode } from '../../../../lib/api/errors';
import { callingUserStore } from '../../callingUserStore';
import { runCreateUserProfileMutation } from '../../operations/runCreateUserProfileMutation/runCreateUserProfileMutation';

/** Onboarding: choosing a username (and name) finishes sign-up. */
export function useCreateProfile() {
  /** Returns a message to show, or null once the profile exists. */
  async function createProfile(profile: CreateUserProfileMutationInput): Promise<string | null> {
    try {
      const result = await runCreateUserProfileMutation(profile);
      if (!result.ok) {
        return result.error.message ?? "Couldn't finish signing up";
      }
      const { callingUser } = callingUserStore.get();
      if (callingUser) {
        callingUserStore.set({ ...callingUser, profile: result.value });
      }
      return null;
    } catch (error) {
      // Someone took the username between the check and the sign-up.
      if (apiErrorCode(error) === 'CONFLICT') {
        return 'Username is taken';
      }
      throw error;
    }
  }

  return { createProfile };
}

import { underMinimumAgeReason, type CreateUserProfileMutationInput } from '@myapp/shared/domains';
import { sessionToken } from '../../../../lib/auth/sessionToken';
import { apiErrorCode } from '../../../../lib/api/errors';
import { callingUserStore } from '../../callingUserStore';
import { runCreateUserProfileMutation } from '../../operations/runCreateUserProfileMutation/runCreateUserProfileMutation';

/** How finishing sign-up went: done, a message to show, or refused for being too young. */
export type CreateProfileOutcome = { kind: 'done' } | { kind: 'error'; message: string } | { kind: 'too-young' };

/** Onboarding: choosing a username (and name) finishes sign-up. */
export function useCreateProfile() {
  async function createProfile(profile: CreateUserProfileMutationInput): Promise<CreateProfileOutcome> {
    try {
      const result = await runCreateUserProfileMutation(profile);
      if (!result.ok) {
        if (result.error.metadata?.reason === underMinimumAgeReason) {
          // The account is gone (see createUserProfileMutation): this device is signed out too.
          await sessionToken.clear();
          callingUserStore.set(null);
          return { kind: 'too-young' };
        }
        return { kind: 'error', message: result.error.message ?? "Couldn't finish signing up" };
      }
      const { callingUser } = callingUserStore.get();
      if (callingUser) {
        callingUserStore.set({ ...callingUser, profile: result.value, termsAcceptedVersion: profile.acceptedTermsVersion });
      }
      return { kind: 'done' };
    } catch (error) {
      // Someone took the username between the check and the sign-up.
      if (apiErrorCode(error) === 'CONFLICT') {
        return { kind: 'error', message: 'Username is taken' };
      }
      throw error;
    }
  }

  return { createProfile };
}

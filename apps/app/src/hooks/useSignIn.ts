import { createUserProfileMutation, type CreateUserProfileMutationInput } from '@myapp/shared/domains';
import { authClient } from '../api/authClient';
import { api } from '../api/trpc';
import { apiErrorCode, nullIfNotFound } from '../api/errors';
import { fromApi, runOperation } from '../api/runOperation';
import { queryClient } from '../api/queryClient';
import { sessionToken } from '../api/sessionToken';
import { callingUserQueryOptions, getCallingUser } from './useCallingUser';

/** A failure to show on the sign-in screen, or null on success. */
export type SignInError = string | null;

const codeErrors: Record<string, string> = {
  INVALID_OTP: "That code isn't right. Check it and try again.",
  OTP_EXPIRED: 'That code has expired. Send a new one.',
  TOO_MANY_ATTEMPTS: 'Too many tries. Send a new code.',
};

/** Everything the sign-in modal does: send a code, check it, choose a username. */
export function useSignIn() {
  /** Emails a 6-digit sign-in code (it's in the API log until email is set up). */
  async function sendCode(email: string): Promise<SignInError> {
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' });
    return error ? (error.message ?? "Couldn't send a code. Try again.") : null;
  }

  /** Signs in with the code; a new email gets an account. Then reloads everything as the signed-in user. */
  async function verifyCode(email: string, code: string): Promise<SignInError> {
    const { error } = await authClient.signIn.emailOtp({ email, otp: code });
    if (error) {
      return (error.code && codeErrors[error.code]) ?? error.message ?? "Couldn't sign in. Try again.";
    }
    // Everything the viewer sees (saves, votes) depends on who's signed in.
    await queryClient.invalidateQueries();
    await queryClient.fetchQuery(callingUserQueryOptions);
    return null;
  }

  /** Finishes sign-up by choosing a username. */
  async function createProfile(profile: CreateUserProfileMutationInput): Promise<SignInError> {
    try {
      const result = await runOperation(createUserProfileMutation, profile, {
        getCallingUser,
        getUserProfileByUsername: ({ username }) =>
          nullIfNotFound(fromApi(api.users.getUserProfile.query({ username }))),
        createUserProfile: ({ username, firstName, lastName, about }) =>
          fromApi(api.auth.signUp.mutate({ username, firstName, lastName, about })),
      });
      if (!result.ok) {
        return result.error.message ?? "Couldn't finish signing up";
      }
    } catch (error) {
      // Someone took the username between the check and the sign-up.
      if (apiErrorCode(error) === 'CONFLICT') {
        return 'Username is taken';
      }
      throw error;
    }
    await queryClient.invalidateQueries();
    return null;
  }

  return { sendCode, verifyCode, createProfile };
}

/** Signs out on this device and forgets everything cached for the user. */
export async function signOut() {
  await authClient.signOut();
  await sessionToken.clear();
  queryClient.clear();
}

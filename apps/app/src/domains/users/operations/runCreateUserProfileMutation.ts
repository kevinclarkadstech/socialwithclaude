import { createUserProfileMutation, type CreateUserProfileMutationInput } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';
import { fromApi } from '../../../lib/api/results';
import { nullIfNotFound } from '../../../lib/api/errors';
import { logger } from '../../../lib/logger';
import { getCallingUser } from '../callingUserStore';

/** Finishes sign-up by creating the signed-in user's profile. A taken username is caught before it's sent. */
export function runCreateUserProfileMutation(profile: CreateUserProfileMutationInput) {
  return createUserProfileMutation({
    input: profile,
    context: { logger },
    dependencies: {
      getCallingUser,
      getUserProfileByUsername: ({ username }) =>
        nullIfNotFound(fromApi(api.users.getUserProfile.query({ username }))),
      createUserProfile: ({ username, firstName, lastName, about }) =>
        fromApi(api.auth.signUp.mutate({ username, firstName, lastName, about })),
    },
  });
}

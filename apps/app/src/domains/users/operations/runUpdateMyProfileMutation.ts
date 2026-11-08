import { updateMyProfileMutation, type UpdateMyProfileMutationInput } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';
import { fromApi } from '../../../lib/api/results';
import { nullIfConflict, nullIfNotFound } from '../../../lib/api/errors';
import { logger } from '../../../lib/logger';
import { getCallingUser } from '../callingUserStore';

/** Saves the signed-in user's username, name and about. A taken username fails with a conflict. */
export function runUpdateMyProfileMutation(profile: UpdateMyProfileMutationInput) {
  return updateMyProfileMutation({
    input: profile,
    context: { logger },
    dependencies: {
      getCallingUser,
      getUserProfileByUsername: ({ username }) =>
        nullIfNotFound(fromApi(api.users.getUserProfile.query({ username }))),
      // A username taken between the check and the save comes back as a conflict.
      updateUserProfile: ({ username, firstName, lastName, about }) =>
        nullIfConflict(fromApi(api.users.updateMyProfile.mutate({ username, firstName, lastName, about }))),
    },
  });
}

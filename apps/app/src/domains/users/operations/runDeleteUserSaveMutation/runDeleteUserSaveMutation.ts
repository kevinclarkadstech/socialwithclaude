import { deleteUserSaveMutation, type DeleteUserSaveMutationInput } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../callingUserStore';

/** Unsaves a post, comment or chat message. */
export function runDeleteUserSaveMutation(save: DeleteUserSaveMutationInput) {
  return deleteUserSaveMutation({
    input: save,
    context: { logger },
    dependencies: {
      getCallingUser,
      deleteUserSave: async ({ type, id }) => {
        await fromApi(api.users.unsave.mutate({ type, id }));
        return true;
      },
    },
  });
}

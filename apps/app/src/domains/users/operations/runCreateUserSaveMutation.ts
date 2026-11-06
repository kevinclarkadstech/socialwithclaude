import { createUserSaveMutation, type CreateUserSaveMutationInput } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';
import { fromApi } from '../../../lib/api/results';
import { logger } from '../../../lib/logger';
import { getCallingUser } from '../callingUserStore';

/** Saves a post, comment or chat message. */
export function runCreateUserSaveMutation(save: CreateUserSaveMutationInput) {
  return createUserSaveMutation({
    input: save,
    context: { logger },
    dependencies: {
      getCallingUser,
      createUserSave: async ({ type, id }) => {
        await fromApi(api.users.save.mutate({ type, id }));
        return true;
      },
    },
  });
}

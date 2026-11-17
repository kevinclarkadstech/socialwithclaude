import type { BanUserMutationInput } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';

/** Bans someone. Straight to the API, which checks who they are (see banUserMutation). */
export function runBanUserMutation(input: BanUserMutationInput) {
  return api.admin.banUser.mutate(input);
}

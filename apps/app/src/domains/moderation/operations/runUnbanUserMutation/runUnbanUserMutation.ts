import type { UnbanUserMutationInput } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';

/** Lifts someone's ban. Straight to the API (see unbanUserMutation). */
export function runUnbanUserMutation(input: UnbanUserMutationInput) {
  return api.moderation.unbanUser.mutate(input);
}

import type { WarnUserMutationInput } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';

/** Warns someone. Straight to the API, which checks who they are and sends the notification (see warnUserMutation). */
export function runWarnUserMutation(input: WarnUserMutationInput) {
  return api.admin.warnUser.mutate(input);
}

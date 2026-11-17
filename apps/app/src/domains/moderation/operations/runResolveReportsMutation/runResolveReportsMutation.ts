import type { ResolveReportsMutationInput } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';

/**
 * Settles a reported thing's open reports (and removes it, for "removed").
 * Straight to the API: removing content, its files and the log entry all
 * happen there (see resolveReportsMutation), so there's nothing to run here first.
 */
export function runResolveReportsMutation(input: ResolveReportsMutationInput) {
  return api.moderation.resolveReports.mutate(input);
}

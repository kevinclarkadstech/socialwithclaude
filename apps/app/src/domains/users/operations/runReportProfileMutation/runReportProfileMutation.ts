import { reportProfileMutation, type ReportProfileMutationInput, type UserProfile } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../callingUserStore';

/** Reports `profile`'s user. The API keeps a snapshot of their profile. */
export function runReportProfileMutation({ profile, report }: {
  profile: UserProfile;
  report: Omit<ReportProfileMutationInput, 'reportedUserId'>;
}) {
  const input = { ...report, reportedUserId: profile.userId };
  return reportProfileMutation({
    input,
    context: { logger },
    dependencies: {
      getCallingUser,
      getUserProfileByUserId: async () => profile,
      createProfileReport: () => fromApi(api.users.reportProfile.mutate(input)),
    },
  });
}

import type { CallingUser } from "../../../users/types/calling-user";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { hasProfile, isSignedIn } from "../../../../authorization/conditions/conditions";

/**
 * Anyone who has finished sign-up can report a post, whoever can see it now:
 * being blocked, or unfollowed by a followers-only account, mid-report
 * doesn't make it fail. A report shows the reporter nothing of the post.
 */
export const canReportPost: AuthorizationCheck<{ caller: CallingUser | null }> = ({ caller }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    return allow(caller);
};

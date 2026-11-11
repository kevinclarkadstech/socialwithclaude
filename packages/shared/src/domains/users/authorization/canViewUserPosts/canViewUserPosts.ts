import type { CallingUser } from "../../types/calling-user";
import type { ViewerFollowStatus } from "../../types/user-follow";
import type { UserProfile } from "../../types/user-profile";
import type { ProfileVisibility } from "../../types/user-settings";
import { allow, disallow, type AuthorizationCheck } from "../../../../common/authorization/allowDisallow/allowDisallow";
import { hasBlocked, isBlockedBy, isSelf } from "../../../../common/authorization/conditions/conditions";

/**
 * Who can see a user's posts and listings on their profile: everyone for a
 * public profile, only approved followers for a followers-only one, and
 * always the user themselves. Blocking hides them both ways.
 */
export const canViewUserPosts: AuthorizationCheck<{
    caller: CallingUser | null;
    profile: Pick<UserProfile, "userId">;
    visibility: ProfileVisibility;
    followStatus: ViewerFollowStatus;
}, CallingUser | null> = ({ caller, profile, visibility, followStatus }) => {
    if (caller && isBlockedBy(caller, profile.userId)) {
        return disallow("blocked-by-user");
    }
    if (caller && hasBlocked(caller, profile.userId)) {
        return disallow("blocking-user");
    }
    if (caller && isSelf(caller, profile.userId)) {
        return allow(caller);
    }
    if (visibility === "public" || followStatus === "following") {
        return allow(caller);
    }
    return disallow("followers-only");
};

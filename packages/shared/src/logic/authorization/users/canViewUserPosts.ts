import type { CallingUser } from "../../../domains/users/types/calling-user";
import type { ViewerFollowStatus } from "../../../domains/users/types/user-follow";
import type { UserProfile } from "../../../domains/users/types/user-profile";
import type { ProfileVisibility } from "../../../domains/users/types/user-settings";
import { allow, disallow, type AuthorizationCheck } from "../allowDisallow";
import { hasBlocked, isBlockedBy, isSelf } from "../conditions";

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

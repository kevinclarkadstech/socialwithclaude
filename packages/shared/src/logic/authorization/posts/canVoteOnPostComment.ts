import type { CallingUser } from "../../../domains/users/types/calling-user";
import type { PostComment } from "../../../domains/posts/types/post-comment";
import { allow, disallow, type AuthorizationCheck } from "../allowDisallow";
import { hasProfile, isSignedIn } from "../conditions";

/** Anyone who has finished sign-up can vote on a comment. */
export const canVoteOnPostComment: AuthorizationCheck<{ caller: CallingUser | null; comment: PostComment }> = ({ caller }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    return allow(caller);
};

import type { CallingUser } from "../../../users/types/calling-user";
import type { PostCommentView } from "../../types/post-comment";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { hasProfile, isSignedIn } from "../../../../authorization/conditions/conditions";

/** Anyone who has finished sign-up can vote on a comment. */
export const canVoteOnPostComment: AuthorizationCheck<{ caller: CallingUser | null; comment: PostCommentView }> = ({ caller }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    return allow(caller);
};

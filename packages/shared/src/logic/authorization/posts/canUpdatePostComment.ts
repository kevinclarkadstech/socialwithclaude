import type { CallingUser } from "../../../domains/users/types/calling-user";
import type { PostCommentView } from "../../../domains/posts/types/post-comment";
import { allow, disallow, type AuthorizationCheck } from "../allowDisallow";
import { hasProfile, isCreator, isSignedIn } from "../conditions";

/** Only the author can edit a comment. */
export const canUpdatePostComment: AuthorizationCheck<{ caller: CallingUser | null; comment: PostCommentView }> = ({ caller, comment }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    if (!isCreator(caller, comment)) {
        return disallow("not-creator", "Only the author can edit this comment");
    }
    return allow(caller);
};

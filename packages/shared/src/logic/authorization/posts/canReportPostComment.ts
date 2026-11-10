import type { CallingUser } from "../../../domains/users/types/calling-user";
import type { PostCommentView } from "../../../domains/posts/types/post-comment";
import { allow, disallow, type AuthorizationCheck } from "../allowDisallow";
import { hasProfile, isSignedIn } from "../conditions";

/** Anyone who has finished sign-up can report a comment. */
export const canReportPostComment: AuthorizationCheck<{ caller: CallingUser | null; comment: PostCommentView }> = ({ caller }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    return allow(caller);
};

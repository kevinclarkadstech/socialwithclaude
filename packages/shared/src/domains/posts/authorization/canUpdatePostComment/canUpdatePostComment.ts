import type { CallingUser } from "../../../users/types/calling-user";
import type { PostCommentView } from "../../types/post-comment";
import { allow, disallow, type AuthorizationCheck } from "../../../../common/authorization/allowDisallow/allowDisallow";
import { hasProfile, isCreator, isSignedIn } from "../../../../common/authorization/conditions/conditions";

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

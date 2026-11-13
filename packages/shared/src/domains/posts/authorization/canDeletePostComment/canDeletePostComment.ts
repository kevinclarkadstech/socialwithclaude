import type { CallingUser } from "../../../users/types/calling-user";
import type { PostCommentView } from "../../types/post-comment";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { hasProfile, isCreator, isSignedIn } from "../../../../authorization/conditions/conditions";

/** Only the author can delete a comment. */
export const canDeletePostComment: AuthorizationCheck<{ caller: CallingUser | null; comment: PostCommentView }> = ({ caller, comment }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    if (!isCreator(caller, comment)) {
        return disallow("not-creator", "Only the author can delete this comment");
    }
    return allow(caller);
};

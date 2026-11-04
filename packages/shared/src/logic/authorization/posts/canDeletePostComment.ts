import type { PostComment } from "../../../domains/posts/types/post-comment";
import type { CallingUser, CallingUserWithProfile } from "../../../domains/users/types/calling-user";
import type { Result } from "../../../types/result";
import { unauthorized } from "../../../utils/failures";
import { isCreator } from "../conditions";
import { requireCallerWithProfile } from "../requireCaller";
import { disallowedBecause } from "../disallowedReason";

/** Only the author can delete a comment. */
export function canDeletePostComment(caller: CallingUser | null, comment: PostComment): Result<CallingUserWithProfile> {
    const signedIn = requireCallerWithProfile(caller);
    if (!signedIn.ok) {
        return signedIn;
    }
    if (!isCreator(signedIn.value, comment)) {
        return unauthorized("Only the author can delete this comment", disallowedBecause("not-creator"));
    }
    return signedIn;
}

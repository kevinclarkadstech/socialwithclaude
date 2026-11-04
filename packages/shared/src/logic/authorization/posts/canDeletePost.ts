import type { Post } from "../../../domains/posts/types/post";
import type { CallingUser, CallingUserWithProfile } from "../../../domains/users/types/calling-user";
import type { Result } from "../../../types/result";
import { unauthorized } from "../../../utils/failures";
import { isCreator } from "../conditions";
import { requireCallerWithProfile } from "../requireCaller";
import { disallowedBecause } from "../disallowedReason";

/** Only the author can delete a post (or listing). */
export function canDeletePost(caller: CallingUser | null, post: Post): Result<CallingUserWithProfile> {
    const signedIn = requireCallerWithProfile(caller);
    if (!signedIn.ok) {
        return signedIn;
    }
    if (!isCreator(signedIn.value, post)) {
        return unauthorized("Only the author can delete this post", disallowedBecause("not-creator"));
    }
    return signedIn;
}

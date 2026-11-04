import type { Post } from "../../../domains/posts/types/post";
import type { CallingUser, CallingUserWithProfile } from "../../../domains/users/types/calling-user";
import type { Result } from "../../../types/result";
import { requireCallerWithProfile } from "../requireCaller";

/** Anyone who has finished sign-up can comment on a post. */
export function canCommentOnPost(caller: CallingUser | null, _post: Post): Result<CallingUserWithProfile> {
    return requireCallerWithProfile(caller);
}

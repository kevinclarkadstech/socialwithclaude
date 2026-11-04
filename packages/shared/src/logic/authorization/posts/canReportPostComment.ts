import type { PostComment } from "../../../domains/posts/types/post-comment";
import type { CallingUser, CallingUserWithProfile } from "../../../domains/users/types/calling-user";
import type { Result } from "../../../types/result";
import { requireCallerWithProfile } from "../requireCaller";

/** Anyone who has finished sign-up can report a comment. */
export function canReportPostComment(caller: CallingUser | null, _comment: PostComment): Result<CallingUserWithProfile> {
    return requireCallerWithProfile(caller);
}

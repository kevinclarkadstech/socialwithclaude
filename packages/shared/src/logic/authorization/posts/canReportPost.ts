import type { Post } from "../../../domains/posts/types/post";
import type { CallingUser, CallingUserWithProfile } from "../../../domains/users/types/calling-user";
import type { Result } from "../../../types/result";
import { requireCallerWithProfile } from "../requireCaller";

/** Anyone who has finished sign-up can report a post. */
export function canReportPost(caller: CallingUser | null, _post: Post): Result<CallingUserWithProfile> {
    return requireCallerWithProfile(caller);
}

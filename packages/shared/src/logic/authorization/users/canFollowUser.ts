import type { CallingUser, CallingUserWithProfile } from "../../../domains/users/types/calling-user";
import type { UserProfile } from "../../../domains/users/types/user-profile";
import type { Result } from "../../../types/result";
import { invalid } from "../../../utils/failures";
import { isSelf } from "../conditions";
import { requireCallerWithProfile } from "../requireCaller";

/** Anyone who has finished sign-up can follow (or ask to follow) someone else. */
export function canFollowUser(caller: CallingUser | null, target: UserProfile): Result<CallingUserWithProfile> {
    const signedIn = requireCallerWithProfile(caller);
    if (!signedIn.ok) return signedIn;
    if (isSelf(signedIn.value, target.userId)) return invalid("You can't follow yourself");
    return signedIn;
}

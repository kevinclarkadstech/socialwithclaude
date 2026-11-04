import type { CallingUser, CallingUserWithProfile } from "../../../domains/users/types/calling-user";
import type { UserProfile } from "../../../domains/users/types/user-profile";
import type { Result } from "../../../types/result";
import { invalid } from "../../../utils/failures";
import { isSelf } from "../conditions";
import { requireCallerWithProfile } from "../requireCaller";

/** Anyone who has finished sign-up can start a chat with someone else. */
export function canCreateDirectChat(caller: CallingUser | null, receiver: UserProfile): Result<CallingUserWithProfile> {
    const signedIn = requireCallerWithProfile(caller);
    if (!signedIn.ok) return signedIn;
    if (isSelf(signedIn.value, receiver.userId)) return invalid("You can't chat with yourself");
    return signedIn;
}

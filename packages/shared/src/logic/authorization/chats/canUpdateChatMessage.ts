import type { ChatMessage } from "../../../domains/chats/types/chat-message";
import type { CallingUser, CallingUserWithProfile } from "../../../domains/users/types/calling-user";
import type { Result } from "../../../types/result";
import { unauthorized } from "../../../utils/failures";
import { isCreator } from "../conditions";
import { requireCallerWithProfile } from "../requireCaller";
import { disallowedBecause } from "../disallowedReason";

/** Only the sender can edit a message. */
export function canUpdateChatMessage(caller: CallingUser | null, message: ChatMessage): Result<CallingUserWithProfile> {
    const signedIn = requireCallerWithProfile(caller);
    if (!signedIn.ok) {
        return signedIn;
    }
    if (!isCreator(signedIn.value, message)) {
        return unauthorized("Only the sender can edit this message", disallowedBecause("not-creator"));
    }
    return signedIn;
}

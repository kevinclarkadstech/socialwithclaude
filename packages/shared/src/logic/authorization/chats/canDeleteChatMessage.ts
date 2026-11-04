import type { CallingUser, CallingUserWithProfile } from "../../../domains/users/types/calling-user";
import type { ChatMessage } from "../../../domains/chats/types/chat-message";
import { allow, disallow, type AuthorizationResult } from "../allowDisallow";
import { hasProfile, isCreator, isSignedIn } from "../conditions";

/** Only the sender can delete a message (for everyone). */
export function canDeleteChatMessage(caller: CallingUser | null, message: ChatMessage): AuthorizationResult<CallingUserWithProfile> {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    if (!isCreator(caller, message)) {
        return disallow("not-creator", "Only the sender can delete this message");
    }
    return allow(caller);
}

import type { CallingUser, CallingUserWithProfile } from "../../../domains/users/types/calling-user";
import type { ChatMember } from "../../../domains/chats/types/chat-member";
import { allow, disallow, type AuthorizationResult } from "../allowDisallow";
import { hasProfile, isChatMember, isSignedIn } from "../conditions";

/** Only a chat's members can send messages in it. Anyone else gets not-found. */
export function canSendChatMessage(caller: CallingUser | null, members: ChatMember[]): AuthorizationResult<CallingUserWithProfile> {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    if (!isChatMember(caller, members)) {
        return disallow("not-member", "Chat not found");
    }
    return allow(caller);
}

import { authenticationError, authorizationError, notFoundError } from "../../../error-handling";
import type { CallingUser, CallingUserWithProfile } from "../../../domains/users/types/calling-user";
import type { ChatMember } from "../../../domains/chats/types/chat-member";
import { allow, disallow, type AuthorizationResult } from "../allowDisallow";
import { hasProfile, isChatMember, isSignedIn } from "../conditions";

/**
 * Only a chat's members can see it (its messages, read state, deleting it
 * for themselves). Anyone else gets not-found, so chats aren't revealed.
 */
export function canViewChat(caller: CallingUser | null, members: ChatMember[]): AuthorizationResult<CallingUserWithProfile> {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in", authenticationError());
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required", authorizationError("Finish signing up first"));
    }
    if (!isChatMember(caller, members)) {
        return disallow("not-member", notFoundError("Chat not found"));
    }
    return allow(caller);
}

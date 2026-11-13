import type { CallingUser } from "../../../users/types/calling-user";
import type { ChatMember } from "../../types/chat-member";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { hasProfile, isChatMember, isSignedIn } from "../../../../authorization/conditions/conditions";

/**
 * Only a chat's members can see it (its messages, read state, deleting it
 * for themselves). Anyone else gets not-found, so chats aren't revealed.
 */
export const canViewChat: AuthorizationCheck<{ caller: CallingUser | null; members: ChatMember[] }> = ({ caller, members }) => {
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
};

import type { CallingUser } from "../../../users/types/calling-user";
import type { ChatMember } from "../../types/chat-member";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { hasBlocked, hasProfile, isBlockedBy, isChatMember, isSignedIn } from "../../../../authorization/conditions/conditions";

/**
 * Only a chat's members can send messages in it (anyone else gets
 * not-found), and not across a block: not to someone who blocked them, nor
 * to someone they blocked (they can unblock).
 */
export const canSendChatMessage: AuthorizationCheck<{ caller: CallingUser | null; members: Pick<ChatMember, "userId">[] }> = ({ caller, members }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    if (!isChatMember(caller, members)) {
        return disallow("not-member", "Chat not found");
    }
    const others = members.filter((member) => member.userId !== caller.userId);
    if (others.some((member) => isBlockedBy(caller, member.userId))) {
        return disallow("blocked-by-user", "You can't reply to this chat");
    }
    if (others.some((member) => hasBlocked(caller, member.userId))) {
        return disallow("blocking-user", "Unblock them to send messages");
    }
    return allow(caller);
};

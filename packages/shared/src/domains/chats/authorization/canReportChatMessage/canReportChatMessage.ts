import type { CallingUser } from "../../../users/types/calling-user";
import type { ChatMember } from "../../types/chat-member";
import type { ChatMessage } from "../../types/chat-message";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { hasProfile, isChatMember, isCreator, isSignedIn } from "../../../../authorization/conditions/conditions";

/**
 * A chat's members can report a message someone else sent in it (`members`
 * is the message's chat's), blocks or not: a block doesn't stop you
 * reporting what was said before it. Anyone else gets not-found.
 */
export const canReportChatMessage: AuthorizationCheck<{
    caller: CallingUser | null;
    members: Pick<ChatMember, "userId">[];
    message: Pick<ChatMessage, "createdBy">;
}> = ({ caller, members, message }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    if (!isChatMember(caller, members)) {
        return disallow("not-member", "Message not found");
    }
    if (isCreator(caller, message)) {
        return disallow("self", "You can't report your own message");
    }
    return allow(caller);
};

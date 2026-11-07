import type { CallingUser } from "../../../domains/users/types/calling-user";
import type { ChatMessage } from "../../../domains/chats/types/chat-message";
import { allow, disallow, type AuthorizationCheck } from "../allowDisallow";
import { hasProfile, isCreator, isSignedIn } from "../conditions";

/** Only the sender can edit a message. */
export const canUpdateChatMessage: AuthorizationCheck<{ caller: CallingUser | null; message: ChatMessage }> = ({ caller, message }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    if (!isCreator(caller, message)) {
        return disallow("not-creator", "Only the sender can edit this message");
    }
    return allow(caller);
};

import type { CallingUser } from "../../../domains/users/types/calling-user";
import type { ChatMessageView } from "../../../domains/chats/types/chat-message";
import { allow, disallow, type AuthorizationCheck } from "../allowDisallow";
import { hasProfile, isCreator, isSignedIn } from "../conditions";

/** Only the sender can delete a message (for everyone). */
export const canDeleteChatMessage: AuthorizationCheck<{ caller: CallingUser | null; message: ChatMessageView }> = ({ caller, message }) => {
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
};

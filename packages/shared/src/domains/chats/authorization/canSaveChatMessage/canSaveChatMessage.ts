import type { CallingUser } from "../../../users/types/calling-user";
import type { ChatMember } from "../../types/chat-member";
import { allow, disallow, type AuthorizationCheck } from "../../../../authorization/allowDisallow/allowDisallow";
import { hasProfile, isChatMember, isSignedIn } from "../../../../authorization/conditions/conditions";

/** A chat's members can save its messages (`members` is the message's chat's). Anyone else gets not-found. */
export const canSaveChatMessage: AuthorizationCheck<{ caller: CallingUser | null; members: Pick<ChatMember, "userId">[] }> = ({ caller, members }) => {
    if (!isSignedIn(caller)) {
        return disallow("not-signed-in");
    }
    if (!hasProfile(caller)) {
        return disallow("profile-required");
    }
    if (!isChatMember(caller, members)) {
        return disallow("not-member", "Message not found");
    }
    return allow(caller);
};

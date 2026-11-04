import type { ChatMember } from "../../../domains/chats/types/chat-member";
import type { CallingUser, CallingUserWithProfile } from "../../../domains/users/types/calling-user";
import type { Result } from "../../../types/result";
import { notFound } from "../../../utils/failures";
import { isChatMember } from "../conditions";
import { requireCallerWithProfile } from "../requireCaller";

/** Only a chat's members can send messages in it. Anyone else gets not-found. */
export function canSendChatMessage(caller: CallingUser | null, members: ChatMember[]): Result<CallingUserWithProfile> {
    const signedIn = requireCallerWithProfile(caller);
    if (!signedIn.ok) return signedIn;
    if (!isChatMember(signedIn.value, members)) return notFound("Chat not found");
    return signedIn;
}

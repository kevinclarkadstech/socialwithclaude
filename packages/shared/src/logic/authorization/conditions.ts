import type { ChatMember } from "../../domains/chats/types/chat-member";
import type { CallingUser } from "../../domains/users/types/calling-user";

/** The caller created `entity`. */
export const isCreator = (caller: CallingUser, entity: { createdBy: string }) => entity.createdBy === caller.userId;

/** `userId` is the caller. */
export const isSelf = (caller: CallingUser, userId: string) => userId === caller.userId;

/** The caller is one of a chat's `members`. */
export const isChatMember = (caller: CallingUser, members: ChatMember[]) =>
    members.some((member) => member.userId === caller.userId);

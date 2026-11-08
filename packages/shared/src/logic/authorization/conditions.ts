import type { ChatMember } from "../../domains/chats/types/chat-member";
import type { CallingUser, CallingUserWithProfile } from "../../domains/users/types/calling-user";

/** Someone is signed in. */
export const isSignedIn = (caller: CallingUser | null): caller is CallingUser => caller !== null;

/** The caller has finished sign-up. */
export const hasProfile = (caller: CallingUser): caller is CallingUserWithProfile => caller.profile !== null;

/** The caller created `entity`. */
export const isCreator = (caller: CallingUser, entity: { createdBy: string }) => entity.createdBy === caller.userId;

/** `userId` is the caller. */
export const isSelf = (caller: CallingUser, userId: string) => userId === caller.userId;

/** The caller is one of a chat's `members`. */
export const isChatMember = (caller: CallingUser, members: ChatMember[]) =>
    members.some((member) => member.userId === caller.userId);

/** The caller has blocked `userId`. */
export const hasBlocked = (caller: CallingUser, userId: string) => caller.blockList.blocking.includes(userId);

/** `userId` has blocked the caller. */
export const isBlockedBy = (caller: CallingUser, userId: string) => caller.blockList.blockedBy.includes(userId);

/** Everyone the caller has blocked or been blocked by: their posts are left out of lists. */
export const blockedEitherWay = (caller: CallingUser | null): string[] =>
    caller ? [...caller.blockList.blocking, ...caller.blockList.blockedBy] : [];

import type { ChatMember } from "../domains/chats/types/chat-member";
import type { ChatMessage } from "../domains/chats/types/chat-message";
import type { Post } from "../domains/posts/types/post";
import type { PostComment } from "../domains/posts/types/post-comment";
import type { CallingUser } from "../domains/users/types/calling-user";
import type { UserProfile } from "../domains/users/types/user-profile";

export const now = "2026-01-01T00:00:00.000Z";

export const userId1 = "01JAAAAAAAAAAAAAAAAAAAAAA1";
export const userId2 = "01JAAAAAAAAAAAAAAAAAAAAAA2";

export function mockProfile(overrides: Partial<UserProfile> = {}): UserProfile {
    return {
        userId: userId1,
        username: "user1",
        firstName: null,
        lastName: null,
        about: null,
        numFollowers: 0,
        numFollowing: 0,
        numPosts: 0,
        numListings: 0,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

/** A signed-in user who has finished sign-up. */
export function mockCaller(overrides: Partial<CallingUser> = {}): CallingUser {
    const userId = overrides.userId ?? userId1;
    return {
        userId,
        email: "user1@example.com",
        sessionId: "session-1",
        profile: mockProfile({ userId }),
        blockList: { blocking: [], blockedBy: [] },
        ...overrides,
    };
}

const creator = { userId: userId1, username: "user1", firstName: null, lastName: null, updatedAt: now };

export function mockPost(overrides: Partial<Post> = {}): Post {
    return {
        id: "01JBBBBBBBBBBBBBBBBBBBBBB1",
        type: "post",
        content: "Hello",
        numSaves: 0,
        numComments: 0,
        numShares: 0,
        numReactions: 0,
        media: [],
        creator: { ...creator, profileVisibility: "public" },
        viewer: { hasSaved: false, followsCreator: false },
        createdBy: userId1,
        updatedBy: userId1,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

export function mockPostComment(overrides: Partial<PostComment> = {}): PostComment {
    return {
        id: "01JCCCCCCCCCCCCCCCCCCCCCC1",
        postId: mockPost().id,
        content: "Nice",
        numUpVotes: 0,
        numDownVotes: 0,
        creator,
        viewer: { hasSaved: false, vote: null },
        createdBy: userId1,
        updatedBy: userId1,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

export function mockChatMember(overrides: Partial<ChatMember> = {}): ChatMember {
    return {
        chatId: "01JDDDDDDDDDDDDDDDDDDDDDD1",
        userId: userId1,
        lastReadAt: null,
        clearedAt: null,
        createdAt: now,
        ...overrides,
    };
}

export function mockChatMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
    return {
        id: "01JEEEEEEEEEEEEEEEEEEEEEE1",
        chatId: mockChatMember().chatId,
        content: "Hi",
        creator,
        viewer: { hasSaved: false },
        createdBy: userId1,
        updatedBy: userId1,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

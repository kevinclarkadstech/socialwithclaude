import type {
    UserBlock,
    UserFeedback,
    UserFollow,
    UserProfile,
    UserSession,
    UserSettings,
} from "@myapp/shared/domains";
import type { schema } from "../db";

type UserProfileRow = typeof schema.userProfiles.$inferSelect;
type UserSettingsRow = typeof schema.userSettings.$inferSelect;
type UserFollowRow = typeof schema.userFollows.$inferSelect;
type UserBlockRow = typeof schema.userBlocks.$inferSelect;
type UserFeedbackRow = typeof schema.userFeedback.$inferSelect;
type SessionRow = typeof schema.sessions.$inferSelect;

export function toUserProfile(row: UserProfileRow): UserProfile {
    return {
        userId: row.userId,
        username: row.username,
        firstName: row.firstName,
        lastName: row.lastName,
        about: row.about,
        numFollowers: row.numFollowers,
        numFollowing: row.numFollowing,
        numPosts: row.numPosts,
        numListings: row.numListings,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function toUserSettings(row: UserSettingsRow): UserSettings {
    return {
        userId: row.userId,
        darkModeEnabled: row.darkModeEnabled,
        followersCanTag: row.followersCanTag,
        nonFollowersCanTag: row.nonFollowersCanTag,
        profileVisibility: row.profileVisibility,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function toUserFollow(row: UserFollowRow): UserFollow {
    return {
        followerId: row.followerId,
        followingId: row.followingId,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function toUserBlock(row: UserBlockRow): UserBlock {
    return {
        userId: row.userId,
        blockedUserId: row.blockedUserId,
        createdAt: row.createdAt.toISOString(),
    };
}

export function toUserFeedback(row: UserFeedbackRow): UserFeedback {
    return {
        id: row.id,
        userId: row.userId,
        category: row.category,
        message: row.message,
        pageUrl: row.pageUrl,
        userAgent: row.userAgent,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function toUserSession(row: SessionRow): UserSession {
    return {
        id: row.id,
        userId: row.userId,
        token: row.token,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        expiresAt: row.expiresAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

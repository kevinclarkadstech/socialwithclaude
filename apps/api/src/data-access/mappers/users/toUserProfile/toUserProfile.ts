import type { UserProfile } from "@myapp/shared/domains";

import type { UserProfileRow } from "../../types";

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

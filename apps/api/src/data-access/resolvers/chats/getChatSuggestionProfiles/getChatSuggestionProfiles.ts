import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import type { UserProfileSummary } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { creatorFields } from "../../../constants";
import { toCreator } from "../../../mappers/users/toCreator/toCreator";
import { isAvailable } from "../../../internal/users/isAvailable/isAvailable";

/**
 * People `userId` follows (accepted) and hasn't messaged with yet (no chat
 * with a message, as the inbox shows), most recently followed first; never
 * `excludedUserIds` or anyone unavailable (see isAvailable).
 */
export async function getChatSuggestionProfiles({ userId, excludedUserIds, limit }: {
    userId: string;
    excludedUserIds: string[];
    limit: number;
}): Promise<UserProfileSummary[]> {
    const follows = schema.userFollows;
    const chats = schema.chats;
    const rows = await db
        .select(creatorFields)
        .from(follows)
        .innerJoin(schema.userProfiles, eq(schema.userProfiles.userId, follows.followingId))
        .where(and(
            eq(follows.followerId, userId),
            eq(follows.status, "accepted"),
            excludedUserIds.length ? notInArray(follows.followingId, excludedUserIds) : undefined,
            // No 1:1 chat with a message between the two yet, whoever started it.
            sql`not exists (select 1 from ${chats} where ${chats.lastMessageAt} is not null and least(${chats.createdBy}, ${chats.receiverId}) = least(${userId}, ${follows.followingId}) and greatest(${chats.createdBy}, ${chats.receiverId}) = greatest(${userId}, ${follows.followingId}))`,
            isAvailable(follows.followingId),
        ))
        .orderBy(desc(follows.createdAt))
        .limit(limit);
    return rows.map(toCreator);
}

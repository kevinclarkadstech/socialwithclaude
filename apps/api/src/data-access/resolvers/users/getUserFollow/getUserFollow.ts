import { and, eq } from "drizzle-orm";
import type { UserFollow } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserFollow } from "../../../mappers/users";

/** `followerId`'s follow (or request) of `followingId`, or null if there's none. */
export async function getUserFollow({ followerId, followingId }: {
    followerId: string;
    followingId: string;
}): Promise<UserFollow | null> {
    const [row] = await db
        .select()
        .from(schema.userFollows)
        .where(and(eq(schema.userFollows.followerId, followerId), eq(schema.userFollows.followingId, followingId)));
    return row ? toUserFollow(row) : null;
}

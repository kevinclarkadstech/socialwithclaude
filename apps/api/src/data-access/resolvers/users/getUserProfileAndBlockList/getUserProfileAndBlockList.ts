import { eq, sql } from "drizzle-orm";
import type { UserBlockList, UserProfile } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserProfile } from "../../../mappers/users/toUserProfile/toUserProfile";

const blocks = schema.userBlocks;

/**
 * A user's profile (null until they've finished sign-up) and block list, in
 * one query: it runs on every signed-in request (see auth's customSession).
 */
export async function getUserProfileAndBlockList({ userId }: { userId: string }): Promise<{
    profile: UserProfile | null;
    blockList: UserBlockList;
}> {
    const [row] = await db
        .select({
            profile: schema.userProfiles,
            blocking: sql<string[]>`array(select ${blocks.blockedUserId} from ${blocks} where ${blocks.userId} = ${schema.users.id})`,
            blockedBy: sql<string[]>`array(select ${blocks.userId} from ${blocks} where ${blocks.blockedUserId} = ${schema.users.id})`,
        })
        .from(schema.users)
        .leftJoin(schema.userProfiles, eq(schema.userProfiles.userId, schema.users.id))
        .where(eq(schema.users.id, userId));
    return {
        profile: row?.profile ? toUserProfile(row.profile) : null,
        blockList: { blocking: row?.blocking ?? [], blockedBy: row?.blockedBy ?? [] },
    };
}

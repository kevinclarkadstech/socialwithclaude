import { inArray, sql } from "drizzle-orm";
import type { MentionCandidate } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { isNotBanned } from "../../../internal/users/isNotBanned/isNotBanned";

/**
 * The people with these usernames (who exist and aren't banned), with what
 * deciding whether to tell them about a mention takes (see mentionRecipients):
 * whether they follow the post's creator, and any block with whoever
 * mentioned them or with the creator.
 */
export async function getMentionCandidates({ usernames, actorId, postCreatorId }: {
    usernames: string[];
    actorId: string;
    postCreatorId: string;
}): Promise<MentionCandidate[]> {
    if (usernames.length === 0) {
        return [];
    }
    const p = schema.userProfiles;
    const f = schema.userFollows;
    const b = schema.userBlocks;
    const blockedWith = (otherId: string) =>
        sql<boolean>`exists (select 1 from ${b} where (${b.userId} = ${p.userId} and ${b.blockedUserId} = ${otherId}) or (${b.userId} = ${otherId} and ${b.blockedUserId} = ${p.userId}))`;
    return db
        .select({
            userId: p.userId,
            followsCreator: sql<boolean>`exists (select 1 from ${f} where ${f.followerId} = ${p.userId} and ${f.followingId} = ${postCreatorId} and ${f.status} = 'accepted')`,
            blockedWithActor: blockedWith(actorId),
            blockedWithCreator: blockedWith(postCreatorId),
        })
        .from(p)
        .where(sql`${inArray(p.username, usernames)} and ${isNotBanned(p.userId)}`);
}

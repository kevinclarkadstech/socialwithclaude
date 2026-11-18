import { and, asc, isNotNull, lte } from "drizzle-orm";
import { db, schema } from "../../../db";

/** Ids of accounts scheduled for deletion at or before `scheduledBefore`, oldest first (at most `limit`). */
export async function getAccountsDueForPurge({ scheduledBefore, limit }: { scheduledBefore: Date; limit: number }): Promise<string[]> {
    const rows = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(and(isNotNull(schema.users.deletionScheduledAt), lte(schema.users.deletionScheduledAt, scheduledBefore)))
        .orderBy(asc(schema.users.deletionScheduledAt))
        .limit(limit);
    return rows.map(({ id }) => id);
}
